# Copyright (C) 2017 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Access Control Role model"""

from sqlalchemy.orm import validates

from ggrc import db
from ggrc.models import mixins
from ggrc.models.mixins import attributevalidator
from ggrc.fulltext.mixin import Indexed


class AccessControlRole(Indexed, attributevalidator.AttributeValidator, mixins.Base, db.Model):
  """Access Control Role

  Model holds all roles in the application. These roles can be added
  by the users.
  """
  __tablename__ = 'access_control_roles'

  name = db.Column(db.String, nullable=False)
  object_type = db.Column(db.String)
  tooltip = db.Column(db.String)

  read = db.Column(db.Boolean, nullable=False, default=True)
  update = db.Column(db.Boolean, nullable=False, default=True)
  delete = db.Column(db.Boolean, nullable=False, default=True)
  my_work = db.Column(db.Boolean, nullable=False, default=True)

  access_control_list = db.relationship(
      'AccessControlList', backref='ac_role', cascade='all, delete-orphan')

  _reserved_names = {}

  @staticmethod
  def _extra_table_args(_):
    return (
        db.UniqueConstraint('name', 'object_type'),
    )

  @classmethod
  def eager_query(cls):
    return super(AccessControlRole, cls).eager_query()

  _publish_attrs = [
      "name",
      "object_type",
      "tooltip",
      "read",
      "update",
      "delete",
      "my_work",
  ]

  @validates("name", "object_type")
  def validates_name(self, key, value):  # pylint: disable=no-self-use
    """Validate Custom Role name uniquness.

    Custom Role names need to follow 2 uniqueness rules:
      1) Names must not match any attribute name on any existing object.
      2) Object level CAD names must not match any global CAD name.

    This validator should check for name collisions for 1st and 2nd rule.

    This validator works, because object_type is never changed. It only
    gets set when the role is created and after that only name filed can
    change. This makes validation using both fields possible.

    Args:
      value: access control role name

    Returns:
      value if the name passes all uniqueness checks.
    """
    if key == "name" and self.object_type:
      name = value.strip()
      object_type = self.object_type
    elif key == "object_type" and self.name:
      name = self.name.strip()
      object_type = value.strip()
    else:
      return value.strip()

    name = value.strip()
    if name in self._get_reserved_names(object_type):
      raise ValueError(u"Attribute name '{}' is reserved for this object type."
                       .format(name))

    if self._get_global_cad_names(object_type).get(name) is not None:
      raise ValueError(u"Global custom attribute '{}' "
                       u"already exists for this object type"
                       .format(name))

    return name
