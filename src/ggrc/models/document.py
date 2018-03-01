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
  ATTACHMENT = "EVIDENCE"
  REFERENCE_URL = "REFERENCE_URL"
  VALID_DOCUMENT_TYPES = [URL, ATTACHMENT, REFERENCE_URL]
  document_type = deferred(db.Column(db.Enum(*VALID_DOCUMENT_TYPES),
                                     default=URL,
                                     nullable=False),
                           'Document')

  _fulltext_attrs = [
      'title',
      'link',
      'description',
      "document_type",
  ]

  _api_attrs = reflection.ApiAttributes(
      'title',
      'link',
      'description',
      'document_type',
      reflection.Attribute('documentable_obj', read=False, update=False),
      reflection.Attribute('is_uploaded', read=False, update=False),

  )

  _sanitize_html = [
      'title',
      'description',
  ]

  _aliases = {
      'title': 'Title',
      'link': 'Link',
      'description': 'description',
  }

  _allowed_documentables = {'Assessment', 'Control', 'Audit',
                            'Issue', 'RiskAssessment'}

  FILE_NAME_SEPARATOR = '_ggrc'

  @orm.validates('document_type')
  def validate_document_type(self, key, document_type):
    """Returns correct option, otherwise rises an error"""
    if document_type is None:
      document_type = self.URL
    if document_type not in self.VALID_DOCUMENT_TYPES:
      raise exceptions.ValidationError(
          "Invalid value for attribute {attr}. "
          "Expected options are `{url}`, `{attachment}`, `{reference_url}`".
          format(
              attr=key,
              url=self.URL,
              attachment=self.ATTACHMENT,
              reference_url=self.REFERENCE_URL
          )
      )
    return document_type

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
    if self.document_type in (self.URL, self.REFERENCE_URL):
      return self.link
    return u"{} {}".format(self.link, self.title)

  # pylint: disable=no-self-argument
  @slug.expression
  def slug(cls):
    return case([(cls.document_type == cls.ATTACHMENT,
                 func.concat(cls.link, ' ', cls.title))],
                else_=cls.link)

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
    self._is_uploaded = value

  @simple_property
  def documentable_obj(self):
    return self._documentable_obj

  @documentable_obj.setter
  def documentable_obj(self, value):
    self._documentable_obj = value

  def _get_documentable_obj(self):
    """Get documentable object specified"""
    if 'id' not in self._documentable_obj:
      raise exceptions.ValidationError('"id" is mandatory'
                                       ' for documentable_obj')
    if 'type' not in self._documentable_obj:
      raise exceptions.ValidationError(
          '"type" is mandatory for documentable_obj')
    if self._documentable_obj['type'] not in self._allowed_documentables:
      raise exceptions.ValidationError('Allowed types are: {}.'.format(
          ', '.join(self._allowed_documentables)))

    doc_type = self._documentable_obj['type']
    doc_id = self._documentable_obj['id']
    obj = referenced_objects.get(doc_type, doc_id)

    if not obj:
      raise ValueError(
          'Documentable object not found: {type} {id}'.format(type=doc_type,
                                                              id=doc_id))
    return obj

  @staticmethod
  def _build_file_name_postfix(documentable_obj):
    """Build postfix for given documentable object"""
    postfix_parts = [Document.FILE_NAME_SEPARATOR, documentable_obj.slug]

    related_snapshots = documentable_obj.related_objects(_types=['Snapshot'])
    related_snapshots = sorted(related_snapshots, key=lambda it: it.id)

    slugs = (sn.revision.content['slug'] for sn in related_snapshots if
             sn.child_type == documentable_obj.assessment_type)

    postfix_parts.extend(slugs)
    postfix_sting = '_'.join(postfix_parts).lower()

    return postfix_sting

  def _build_relationship(self, documentable_obj):
    """Build relationship between document and documentable object"""
    from ggrc.models import relationship
    rel = relationship.Relationship(
        source=documentable_obj,
        destination=self
    )
    db.session.add(rel)

  def _update_fields(self, response):
    """Update fields of document with values of the copied file"""
    self.link = response['webViewLink']
    self.title = response['name']
    self.document_type = Document.ATTACHMENT

  @staticmethod
  def _get_folder(parent_obj):
    return parent_obj.folder if hasattr(parent_obj, 'folder') else ''

  def _execute_file_copy_flow(self):
    """Execute file copy flow if needed"""
    if hasattr(self, '_documentable_obj') and self._documentable_obj:
      documentable_obj = self._get_documentable_obj()
      postfix = self._build_file_name_postfix(documentable_obj)
      folder_id = self._get_folder(documentable_obj)
      file_id = self.link
      from ggrc.gdrive.file_actions import process_gdrive_file
      response = process_gdrive_file(folder_id, file_id, postfix,
                                     separator=Document.FILE_NAME_SEPARATOR,
                                     is_uploaded=self.is_uploaded)
      self._update_fields(response)
      self._build_relationship(documentable_obj)
      self._documentable_obj = None

  def handle_before_flush(self):
    self._execute_file_copy_flow()
