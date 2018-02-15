# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Roleable model"""
from sqlalchemy import and_
from sqlalchemy import orm
from sqlalchemy.orm import remote
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.ext.hybrid import hybrid_property

from ggrc import db
from ggrc.access_control.list import AccessControlList
from ggrc.access_control import role
from ggrc.fulltext.attributes import CustomRoleAttr
from ggrc.models import reflection
from ggrc.utils.referenced_objects import get


class Roleable(object):
  """Roleable Mixin

  Mixin that adds access_control_list property to the parent object. Access
  control list includes a list of AccessControlList objects.
  """

  _update_raw = _include_links = ['access_control_list', ]
  _fulltext_attrs = [CustomRoleAttr('access_control_list'), ]
  _api_attrs = reflection.ApiAttributes(
      reflection.Attribute('access_control_list', True, True, True))

  @hybrid_property
  def full_access_control_list(self):
    return self._access_control_list + self._propagated_access_control_list

  @declared_attr
  def _propagated_access_control_list(cls):  # pylint: disable=no-self-argument
    """Full access_control_list

       Use with caution and load only when absolutely needed. For performance
       reasons do not add to eager_query.
    """
    return db.relationship(
        'AccessControlList',
        primaryjoin=lambda: and_(
            remote(AccessControlList.object_id) == cls.id,
            remote(AccessControlList.object_type) == cls.__name__,
            remote(AccessControlList.parent_id).isnot(None)),
        foreign_keys='AccessControlList.object_id',
        cascade='all, delete-orphan')

  @declared_attr
  def _access_control_list(cls):  # pylint: disable=no-self-argument
    """access_control_list"""
    return db.relationship(
        'AccessControlList',
        primaryjoin=lambda: and_(
            remote(AccessControlList.object_id) == cls.id,
            remote(AccessControlList.object_type) == cls.__name__,
            remote(AccessControlList.parent_id).is_(None)),
        foreign_keys='AccessControlList.object_id',
        backref='{0}_object'.format(cls.__name__),
        cascade='all, delete-orphan')

  @hybrid_property
  def access_control_list(self):
    return self._access_control_list

  @access_control_list.setter
  def access_control_list(self, values):
    """Setter function for access control list.

    Args:
      value: List of access control roles or dicts containing json
        representation of custom attribute values.
    """
    if values is None:
      return

    new_values = {
        (get("AccessControlRole", value['ac_role_id']),
         get("Person", value['person']['id']))
        for value in values
        if value.get('ac_role_id') is not None
    } | {
        (value['ac_role'], value['person'])
        for value in values
        if value.get('ac_role') is not None and
        value.get('person') is not None
    }
    old_values = {
        (acl.ac_role, acl.person)
        for acl in self.access_control_list
    }
    self._remove_values(old_values - new_values)
    self._add_values(new_values - old_values)

  def _add_values(self, values):
    """Attach new custom role values to current object."""
    for ac_role, person in values:
      AccessControlList(
          object=self,
          person=person,
          ac_role=ac_role
      )

  def _remove_values(self, values):
    """Remove custom role values from current object."""
    val_map = {(acl.ac_role, acl.person): acl
               for acl in self.access_control_list}
    for value in values:
      self._access_control_list.remove(val_map[value])

  @classmethod
  def eager_query(cls):
    """Eager Query"""
    query = super(Roleable, cls).eager_query()
    return cls.eager_inclusions(query, Roleable._include_links).options(
        orm.subqueryload('access_control_list'))

  @classmethod
  def indexed_query(cls):
    query = super(Roleable, cls).indexed_query()
    return query.options(
        orm.subqueryload(
            'access_control_list'
        ).subqueryload(
            "person"
        ).load_only(
            "id",
            "name",
            "email",
        )
    )

  def log_json(self):
    """Log custom attribute values."""
    # pylint: disable=not-an-iterable
    res = super(Roleable, self).log_json()
    res["access_control_list"] = [
        value.log_json() for value in self.access_control_list]
    return res

  def get_persons_for_rolename(self, role_name):
    """Return list of persons that are valid for send role_name."""
    for role_id, name in role.get_custom_roles_for(self.type).iteritems():
      if name != role_name:
        continue
      return [i.person for i in self.access_control_list
              if i.ac_role_id == role_id]
    return []

  def get_person_ids_for_rolename(self, role_name):
    """Return list of persons that are valid for send role_name."""
    for role_id, name in role.get_custom_roles_for(self.type).iteritems():
      if name != role_name:
        continue
      # TODO: use ac_role_id as temporary solution until GGRC-3784 implemented
      return [i.person.id for i in self.access_control_list
              if (i.ac_role and i.ac_role.id == role_id) or
              (i.ac_role_id and i.ac_role_id == role_id)]
    return []
