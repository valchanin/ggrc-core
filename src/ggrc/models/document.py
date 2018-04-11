# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Module containing Document model."""

from sqlalchemy import orm
from sqlalchemy import func, case
from sqlalchemy.ext.hybrid import hybrid_property

from ggrc import db
from ggrc.access_control.roleable import Roleable
from ggrc.builder import simple_property
from ggrc.fulltext.mixin import Indexed
from ggrc.models import exceptions
from ggrc.models import reflection
from ggrc.models import mixins
from ggrc.models.deferred import deferred
from ggrc.models.mixins import Base
from ggrc.models.mixins import before_flush_handleable as bfh
from ggrc.models.relationship import Relatable
from ggrc.utils import referenced_objects


class Document(Roleable, Relatable, Base, mixins.Titled, Indexed,
               bfh.BeforeFlushHandleable, db.Model):
  """Document model."""
  __tablename__ = 'documents'

  _title_uniqueness = False

  link = deferred(db.Column(db.String, nullable=False), 'Document')
  description = deferred(db.Column(db.Text, nullable=False, default=u""),
                         'Document')
  URL = "URL"
  FILE = "FILE"
  REFERENCE_URL = "REFERENCE_URL"
  VALID_DOCUMENT_KINDS = [URL, FILE, REFERENCE_URL]
  kind = deferred(db.Column(db.Enum(*VALID_DOCUMENT_KINDS),
                            default=URL,
                            nullable=False),
                  "Document")
  source_gdrive_id = deferred(db.Column(db.String, nullable=False,
                                        default=u""),
                              'Document')

  gdrive_id = deferred(db.Column(db.String, nullable=False,
                                 default=u""),
                       'Document')

  _api_attrs = reflection.ApiAttributes(
      'title',
      'description',
      reflection.Attribute('link', update=False),
      reflection.Attribute('kind', update=False),
      reflection.Attribute('source_gdrive_id', update=False),
      reflection.Attribute('gdrive_id', create=False, update=False),
      reflection.Attribute('parent_obj', read=False, update=False),
      reflection.Attribute('is_uploaded', read=False, update=False),
  )

  _fulltext_attrs = [
      'title',
      'link',
      'description',
      'kind',
  ]

  _sanitize_html = [
      'title',
      'description',
  ]

  _aliases = {
      'title': 'Title',
      'link': 'Link',
      'description': 'description',
  }

  ALLOWED_PARENTS = {'Control', 'Issue', 'RiskAssessment'}

  FILE_NAME_SEPARATOR = '_ggrc'

  @orm.validates('kind')
  def validate_kind(self, key, kind):
    """Returns correct option, otherwise rises an error"""
    if kind is None:
      kind = self.URL
    if kind not in self.VALID_DOCUMENT_KINDS:
      raise exceptions.ValidationError(
          "Invalid value for attribute {attr}. "
          "Expected options are `{url}`, `{kind}`, `{reference_url}`".
          format(
              attr=key,
              url=self.URL,
              kind=self.FILE,
              reference_url=self.REFERENCE_URL
          )
      )
    return kind

  @classmethod
  def indexed_query(cls):
    return super(Document, cls).indexed_query().options(
        orm.Load(cls).undefer_group(
            "Document_complete",
        ),
    )

  @hybrid_property
  def slug(self):
    """Slug property"""
    if self.kind in (self.URL, self.REFERENCE_URL):
      return self.link
    return u"{} {}".format(self.link, self.title)

  # pylint: disable=no-self-argument
  @slug.expression
  def slug(cls):
    return case([(cls.kind == cls.FILE,
                  func.concat(cls.link, ' ', cls.title))],
                else_=cls.link)

  def _display_name(self):
    result = self.title
    if self.kind == Document.FILE:
      result = self.link + ' ' + self.title
    return result

  def log_json(self):
    tmp = super(Document, self).log_json()
    tmp['type'] = "Document"
    return tmp

  @simple_property
  def is_uploaded(self):
    """This flag is used to know if file uploaded from a local user folder.

    In that case we need just rename file, not copy.
    """
    return self._is_uploaded if hasattr(self, '_is_uploaded') else False

  @is_uploaded.setter
  def is_uploaded(self, value):
    # pylint: disable=attribute-defined-outside-init
    self._is_uploaded = value

  @simple_property
  def parent_obj(self):
    return self._parent_obj

  @parent_obj.setter
  def parent_obj(self, value):
    # pylint: disable=attribute-defined-outside-init
    self._parent_obj = value

  def _get_parent_obj(self):
    """Get parent object specified"""
    if 'id' not in self._parent_obj:
      raise exceptions.ValidationError('"id" is mandatory for parent_obj')
    if 'type' not in self._parent_obj:
      raise exceptions.ValidationError(
          '"type" is mandatory for parent_obj')
    if self._parent_obj['type'] not in self.ALLOWED_PARENTS:
      raise exceptions.ValidationError(
          'Allowed types are: {}.'.format(', '.join(self.ALLOWED_PARENTS)))

    parent_type = self._parent_obj['type']
    parent_id = self._parent_obj['id']
    obj = referenced_objects.get(parent_type, parent_id)

    if not obj:
      raise ValueError(
          'Parent object not found: {type} {id}'.format(type=parent_type,
                                                        id=parent_id))
    return obj

  @staticmethod
  def _build_file_name_postfix(parent_obj):
    """Build postfix for given parent object"""
    postfix_parts = [Document.FILE_NAME_SEPARATOR, parent_obj.slug]

    related_snapshots = parent_obj.related_objects(_types=['Snapshot'])
    related_snapshots = sorted(related_snapshots, key=lambda it: it.id)

    slugs = (sn.revision.content['slug'] for sn in related_snapshots if
             sn.child_type == parent_obj.assessment_type)

    postfix_parts.extend(slugs)
    postfix_sting = '_'.join(postfix_parts).lower()

    return postfix_sting

  def _build_relationship(self, parent_obj):
    """Build relationship between document and documentable object"""
    from ggrc.models import relationship
    rel = relationship.Relationship(
        source=parent_obj,
        destination=self
    )
    db.session.add(rel)

  def _update_fields(self, response):
    """Update fields of document with values of the copied file"""
    self.gdrive_id = response['id']
    self.link = response['webViewLink']
    self.title = response['name']
    self.kind = Document.FILE

  @staticmethod
  def _get_folder(parent):
    return parent.folder if hasattr(parent, 'folder') else ''

  def _map_parent(self):
    """Maps document to documentable object

    If Document.FILE and source_gdrive_id => copy file
    """
    if self.is_with_parent_obj():
      parent = self._get_parent_obj()
      if self.kind == Document.FILE and self.source_gdrive_id:
        self.exec_gdrive_file_copy_flow(parent)
      self._build_relationship(parent)
      self._parent_obj = None

  def exec_gdrive_file_copy_flow(self, documentable_obj):
    """Execute google gdrive file copy flow

    Build file name, destination folder and copy file to that folder.
    After coping fills document object fields with new gdrive URL
    """
    postfix = self._build_file_name_postfix(documentable_obj)
    folder_id = self._get_folder(documentable_obj)
    file_id = self.source_gdrive_id
    from ggrc.gdrive.file_actions import process_gdrive_file
    response = process_gdrive_file(folder_id, file_id, postfix,
                                   separator=Document.FILE_NAME_SEPARATOR,
                                   is_uploaded=self.is_uploaded)
    self._update_fields(response)

  def is_with_parent_obj(self):
    return bool(hasattr(self, '_parent_obj') and self._parent_obj)

  def handle_before_flush(self):
    """Handler that called  before SQLAlchemy flush event"""
    self._map_parent()
