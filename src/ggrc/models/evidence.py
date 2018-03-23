# Copyright (C) 2017 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Module containing Evidence model."""

from sqlalchemy import orm
from sqlalchemy import func, case
from sqlalchemy.ext.hybrid import hybrid_property

from ggrc import db
from ggrc.access_control.roleable import Roleable
from ggrc.builder import simple_property
from ggrc.fulltext import mixin
from ggrc.models.deferred import deferred
from ggrc.models.mixins import Base, Slugged
from ggrc.models.mixins import WithLastDeprecatedDate
from ggrc.models.mixins.statusable import Statusable
from ggrc.models.relationship import Relatable
from ggrc.models import exceptions
from ggrc.models import reflection
from ggrc.models import mixins
from ggrc.utils import referenced_objects
from ggrc.models.mixins import before_flush_handleable as bfh


class Evidence(Roleable, Relatable, mixins.Titled,
               bfh.BeforeFlushHandleable, Slugged, mixin.Indexed, Statusable,
               WithLastDeprecatedDate, db.Model):
  """Evidence (Audit-scope URLs, FILE's) model."""
  __tablename__ = "evidences"

  _title_uniqueness = False

  URL = "URL"
  FILE = "FILE"
  REFERENCE_URL = "REFERENCE_URL"
  VALID_EVIDENCE_KINDS = [URL, FILE, REFERENCE_URL]

  START_STATE = 'Active'
  DEPRECATED = 'Deprecated'

  VALID_STATES = (START_STATE, DEPRECATED, )

  kind = deferred(db.Column(db.Enum(*VALID_EVIDENCE_KINDS),
                            default=URL,
                            nullable=False),
                  "Evidence")
  source_gdrive_id = deferred(db.Column(db.String), "Evidence")

  link = deferred(db.Column(db.String), "Evidence")

  description = deferred(db.Column(db.Text, nullable=False, default=u""),
                         "Evidence")

  _api_attrs = reflection.ApiAttributes(
      "title",
      reflection.Attribute("link", update=False),
      reflection.Attribute("source_gdrive_id", update=False),
      "description",
      "status",
      reflection.Attribute("kind", update=False),
      reflection.Attribute("parent_obj", read=False, update=False),
      reflection.Attribute('archived', create=False, update=False)
  )

  # TODO adopt document to fit evidence interface (source_gdrive_id for copy)

  # assessment -> get related objects should return evidences
  _fulltext_attrs = [
    "title",
    "link",
    "description",
    "kind",
    "archived"
  ]

  AUTO_REINDEX_RULES = [
    mixin.ReindexRule("Audit", lambda x: x.assessments, ["archived"]),
  ]

  _sanitize_html = [
      "title",
      "description",
  ]

  _aliases = {
      "title": "Title",
      "link": "Attachment",
      "description": "description",
      "archived": {
        "display_name": "Archived",
        "mandatory": False
      },
  }

  _allowed_parents = {'Assessment', 'Audit'}

  @orm.validates("kind")
  def validate_kind(self, key, kind):
    """Returns correct option, otherwise rises an error"""
    if kind is None:
      kind = self.URL
    if kind not in self.VALID_EVIDENCE_KINDS:
      raise exceptions.ValidationError(
          "Invalid value for attribute {attr}. "
          "Expected options are `{url}`, `{file}`, `{reference_url}`".
          format(
              attr=key,
              url=self.URL,
              file=self.FILE,
              reference_url=self.REFERENCE_URL
          )
      )
    return kind

  @classmethod
  def indexed_query(cls):
    return super(Evidence, cls).indexed_query().options(
        orm.Load(cls).undefer_group(
            "Evidence_complete",
        ),
    )

  @simple_property
  def parent(self):
    parent_candidates = self.related_objects(_types=Evidence._allowed_parents)
    # TODO: make sure that only one parent (during relationship creation)
    return parent_candidates.pop() if parent_candidates else None

  @simple_property
  def archived(self):
    """Returns a boolean whether parent is archived or not."""
    return self.parent.archived if self.parent else False

  def log_json(self):
    tmp = super(Evidence, self).log_json()
    tmp['type'] = 'Evidence'
    return tmp

  @simple_property
  def parent_obj(self):
    return self._parent_obj

  @parent_obj.setter
  def parent_obj(self, value):
    self._parent_obj = value

  def _get_parent_obj(self):
    """Get parent object specified"""
    if 'id' not in self._parent_obj:
      raise exceptions.ValidationError('"id" is mandatory for parent_obj')
    if 'type' not in self._parent_obj:
      raise exceptions.ValidationError(
        '"type" is mandatory for parent_obj')
    if self._parent_obj['type'] not in self._allowed_parents:
      raise exceptions.ValidationError(
        'Allowed types are: {}.'.format(', '.join(self._allowed_parents)))

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
    postfix_parts = ['_ggrc', parent_obj.slug]

    related_snapshots = parent_obj.related_objects(_types=['Snapshot'])
    related_snapshots = sorted(related_snapshots, key=lambda it: it.id)

    slugs = (sn.revision.content['slug'] for sn in related_snapshots if
             sn.child_type == parent_obj.assessment_type)

    postfix_parts.extend(slugs)
    postfix_sting = '_'.join(postfix_parts).lower()

    return postfix_sting

  def _build_relationship(self, parent_obj):
    """Build relationship between evidence and parent object"""
    from ggrc.models import relationship
    rel = relationship.Relationship(
      source=parent_obj,
      destination=self
    )
    db.session.add(rel)

  def _update_fields(self, response):
    """Update fields of evidence with values of the copied file"""
    self.link = response['webViewLink']
    self.title = response['name']
    self.kind = Evidence.FILE

  def _map_parent(self):
    if hasattr(self, '_parent_obj') and self._parent_obj:
      parent = self._get_parent_obj()
      if self.kind == Evidence.FILE:
        self.exec_gdrive_file_copy_flow(parent)
      self._build_relationship(parent)
      self._parent_obj = None

  def exec_gdrive_file_copy_flow(self, parent):
    postfix = self._build_file_name_postfix(parent)
    folder_id = parent.folder
    file_id = self.source_gdrive_id
    from ggrc.gdrive.file_actions import copy_file
    response = copy_file(folder_id, file_id, postfix)
    self._update_fields(response)

  def validate(self):
    if self.kind == Evidence.FILE and not self.source_gdrive_id:
      raise exceptions.ValidationError(
        '"source_gdrive_id" is mandatory an case of {} evidence type'.format(
          self.FILE))

  def handle_before_flush(self):
    self.validate()
    self._map_parent()
