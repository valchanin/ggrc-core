# Copyright (C) 2017 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Roleable model"""

from sqlalchemy import and_
from sqlalchemy import orm
from sqlalchemy.orm import remote
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.ext.hybrid import hybrid_property

from ggrc.access_control.list import AccessControlList
from ggrc.fulltext.attributes import CustomRoleAttr
from ggrc import db


class Roleable(object):
  """Roleable Mixin

  Mixin that adds access_control_list property to the parent object. Access
  control list includes a list of AccessControlList objects.
  """

  _update_raw = _include_links = _publish_attrs = [
      'access_control_list'
  ]
  _fulltext_attrs = [
      CustomRoleAttr('access_control_list')
  ]

  @declared_attr
  def _access_control_list(self):
    """access_control_list"""
    return db.relationship(
        'AccessControlList',
        primaryjoin=lambda: and_(
            remote(AccessControlList.object_id) == self.id,
            remote(AccessControlList.object_type) == self.__name__),
        foreign_keys='AccessControlList.object_id',
        backref='{0}_object'.format(self.__name__),
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
        (value['ac_role_id'], value['person']['id'])
        for value in values
    }
    old_values = {
        (acl.ac_role_id, acl.person_id)
        for acl in self.access_control_list
    }

    self._remove_values(old_values - new_values)
    self._add_values(new_values - old_values)

  def _add_values(self, values):
    """Attach new custom role values to current object."""
    for ac_role_id, person_id in values:
      AccessControlList(
          object=self,
          person_id=person_id,
          ac_role_id=ac_role_id
      )

  def _remove_values(self, values):
    """Remove custom role values from current object."""
    values_map = {
        (acl.ac_role_id, acl.person_id): acl
        for acl in self.access_control_list
    }
    for value in values:
      self._access_control_list.remove(values_map[value])

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
