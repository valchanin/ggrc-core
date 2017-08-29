# Copyright (C) 2017 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Defines a Revision model for storing snapshots."""

from ggrc import builder
from ggrc import db
from ggrc.models.mixins import Base
from ggrc.models import reflection
from ggrc.access_control import role
from ggrc.models.types import LongJsonType


class Revision(Base, db.Model):
  """Revision object holds a JSON snapshot of the object at a time."""

  __tablename__ = 'revisions'

  resource_id = db.Column(db.Integer, nullable=False)
  resource_type = db.Column(db.String, nullable=False)
  event_id = db.Column(db.Integer, db.ForeignKey('events.id'), nullable=False)
  action = db.Column(db.Enum(u'created', u'modified', u'deleted'),
                     nullable=False)
  _content = db.Column('content', LongJsonType, nullable=False)

  resource_slug = db.Column(db.String, nullable=True)
  source_type = db.Column(db.String, nullable=True)
  source_id = db.Column(db.Integer, nullable=True)
  destination_type = db.Column(db.String, nullable=True)
  destination_id = db.Column(db.Integer, nullable=True)

  @staticmethod
  def _extra_table_args(_):
    return (
        db.Index("revisions_modified_by", "modified_by_id"),
        db.Index("fk_revisions_resource", "resource_type", "resource_id"),
        db.Index("fk_revisions_source", "source_type", "source_id"),
        db.Index("fk_revisions_destination",
                 "destination_type", "destination_id"),
        db.Index('ix_revisions_resource_slug', 'resource_slug'),
    )

  _api_attrs = reflection.ApiAttributes(
      'resource_id',
      'resource_type',
      'source_type',
      'source_id',
      'destination_type',
      'destination_id',
      'action',
      'content',
      'description',
  )

  @classmethod
  def eager_query(cls):
    from sqlalchemy import orm

    query = super(Revision, cls).eager_query()
    return query.options(
        orm.subqueryload('modified_by'),
        orm.subqueryload('event'),  # used in description
    )

  def __init__(self, obj, modified_by_id, action, content):
    self.resource_id = obj.id
    self.resource_type = obj.__class__.__name__
    self.resource_slug = getattr(obj, "slug", None)
    self.modified_by_id = modified_by_id
    self.action = action
    if "access_control_list" in content and content["access_control_list"]:
      for acl in content["access_control_list"]:
        acl["person"] = {
            "id": acl["person_id"],
            "type": "Person",
            "href": "/api/people/{}".format(acl["person_id"]),
        }

    self._content = content

    for attr in ["source_type",
                 "source_id",
                 "destination_type",
                 "destination_id"]:
      setattr(self, attr, getattr(obj, attr, None))

  @builder.simple_property
  def description(self):
    """Compute a human readable description from action and content."""
    if 'display_name' not in self._content:
      return ''
    display_name = self._content['display_name']
    if not display_name:
      result = u"{0} {1}".format(self.resource_type, self.action)
    elif u'<->' in display_name:
      if self.action == 'created':
        msg = u"{destination} linked to {source}"
      elif self.action == 'deleted':
        msg = u"{destination} unlinked from {source}"
      else:
        msg = u"{display_name} {action}"
      source, destination = self._content['display_name'].split('<->')[:2]
      result = msg.format(source=source,
                          destination=destination,
                          display_name=self._content['display_name'],
                          action=self.action)
    elif 'mapped_directive' in self._content:
      # then this is a special case of combined map/creation
      # should happen only for Section and Control
      mapped_directive = self._content['mapped_directive']
      if self.action == 'created':
        result = u"New {0}, {1}, created and mapped to {2}".format(
            self.resource_type,
            display_name,
            mapped_directive
        )
      elif self.action == 'deleted':
        result = u"{0} unmapped from {1} and deleted".format(
            display_name, mapped_directive)
      else:
        result = u"{0} {1}".format(display_name, self.action)
    else:
      # otherwise, it's a normal creation event
      result = u"{0} {1}".format(display_name, self.action)
    if self.event.action == "BULK":
      result += ", via bulk action"
    return result

  @builder.simple_property
  def content(self):
    """Property. Contains the revision content dict.

    Updated by required values, generated from saved content dict."""
    # pylint: disable=too-many-locals
    roles_dict = role.get_custom_roles_for(self.resource_type)
    reverted_roles_dict = {n: i for i, n in roles_dict.iteritems()}
    access_control_list = self._content.get("access_control_list") or []
    map_field_to_role = {
        "principal_assessor": reverted_roles_dict.get("Principal Assignees"),
        "secondary_assessor": reverted_roles_dict.get("Secondary Assignees"),
        "contact": reverted_roles_dict.get("Primary Contacts"),
        "secondary_contact": reverted_roles_dict.get("Secondary Contacts"),
        "owners": reverted_roles_dict.get("Admin"),
    }
    exists_roles = {i["ac_role_id"] for i in access_control_list}
    for field, role_id in map_field_to_role.items():
      if field not in self._content:
        continue
      if role_id in exists_roles or role_id is None:
        continue
      field_content = self._content.get(field) or {}
      if not field_content:
        continue
      if not isinstance(field_content, list):
        field_content = [field_content]
      person_ids = {fc.get("id") for fc in field_content if fc.get("id")}
      for person_id in person_ids:
        access_control_list.append({
            "display_name": roles_dict[role_id],
            "ac_role_id": role_id,
            "context_id": None,
            "created_at": None,
            "object_type": self.resource_type,
            "updated_at": None,
            "object_id": self.resource_id,
            "modified_by_id": None,
            "person_id": person_id,
            # Frontend require data in such format
            "person": {
                "id": person_id,
                "type": "Person",
                "href": "/api/people/{}".format(person_id)
            },
            "modified_by": None,
            "id": None,
        })
    populated_content = self._content.copy()

    # Add person with id and type for old snapshots compatibility
    for acl in access_control_list:
      if "person" not in acl:
        acl["person"] = {"id": acl.get("person_id"), "type": "Person"}
    populated_content["access_control_list"] = access_control_list

    if 'url' in self._content:
      reference_url_list = []
      for key in ('url', 'reference_url'):
        link = self._content[key]
        # link might exist, but can be an empty string - we treat those values
        # as non-existing (empty) reference URLs
        if not link:
          continue

        # if creation/modification date is not available, we estimate it by
        # using the corresponding information from the Revision itself
        created_at = (self._content.get("created_at") or
                      self.created_at.isoformat())
        updated_at = (self._content.get("updated_at") or
                      self.updated_at.isoformat())

        reference_url_list.append({
            "display_name": link,
            "document_type": "REFERENCE_URL",
            "link": link,
            "title": link,
            "id": None,
            "created_at": created_at,
            "updated_at": updated_at,
        })
      populated_content['reference_url'] = reference_url_list

    return populated_content

  @content.setter
  def content(self, value):
    """ Setter for content property."""
    self._content = value
