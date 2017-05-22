# Copyright (C) 2017 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Custom attribute definition module"""

import flask
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.orm import validates
from sqlalchemy.sql.schema import UniqueConstraint

from ggrc import db
from ggrc.models.mixins import attributevalidator
from ggrc.models import mixins
from ggrc.models.custom_attribute_value import CustomAttributeValue
from ggrc.models.exceptions import ValidationError


class CustomAttributeDefinition(attributevalidator.AttributeValidator,
                                mixins.Base, mixins.Titled, db.Model):
  """Custom attribute definition model.

  Attributes:
    multi_choice_mandatory: comma separated values of mandatory bitmaps.
      First lsb is for comment, second bit is for attachement.
  """

  __tablename__ = 'custom_attribute_definitions'

  definition_type = db.Column(db.String, nullable=False)
  definition_id = db.Column(db.Integer)
  attribute_type = db.Column(db.String, nullable=False)
  multi_choice_options = db.Column(db.String)
  multi_choice_mandatory = db.Column(db.String)
  mandatory = db.Column(db.Boolean)
  helptext = db.Column(db.String)
  placeholder = db.Column(db.String)

  attribute_values = db.relationship('CustomAttributeValue',
                                     backref='custom_attribute',
                                     cascade='all, delete-orphan')

  @property
  def definition_attr(self):
    return '{0}_definition'.format(self.definition_type)

  @property
  def definition(self):
    return getattr(self, self.definition_attr)

  @definition.setter
  def definition(self, value):
    self.definition_id = getattr(value, 'id', None)
    if hasattr(value, '_inflector'):
      self.definition_type = value._inflector.table_singular
    else:
      self.definition_type = ''
    return setattr(self, self.definition_attr, value)

  _extra_table_args = (
      UniqueConstraint('definition_type', 'definition_id', 'title',
                       name='uq_custom_attribute'),
      db.Index('ix_custom_attributes_title', 'title'))

  _include_links = _publish_attrs = [
      'definition_type',
      'definition_id',
      'attribute_type',
      'multi_choice_options',
      'multi_choice_mandatory',
      'mandatory',
      'helptext',
      'placeholder',
  ]

  _sanitize_html = [
      "multi_choice_options",
      "helptext",
      "placeholder",
  ]

  _reserved_names = {}

  def _clone(self, target):
    """Clone custom attribute definitions."""
    data = {
        "title": self.title,
        "definition_type": self.definition_type,
        "definition_id": target.id,
        "attribute_type": self.attribute_type,
        "multi_choice_options": self.multi_choice_options,
        "multi_choice_mandatory": self.multi_choice_mandatory,
        "mandatory": self.mandatory,
        "helptext": self.helptext,
        "placeholder": self.placeholder,
    }
    ca_definition = CustomAttributeDefinition(**data)
    db.session.add(ca_definition)
    db.session.flush()
    return ca_definition

  class ValidTypes(object):
    """Class representing valid custom attribute definitions.

    Basically an enum, therefore no need for public methods.
    """
    # pylint: disable=too-few-public-methods
    TEXT = "Text"
    RICH_TEXT = "Rich Text"
    DROPDOWN = "Dropdown"
    CHECKBOX = "Checkbox"
    DATE = "Date"
    MAP = "Map"

  class MultiChoiceMandatoryFlags(object):
    """Enum representing flags in multi_choice_mandatory bitmaps."""
    # pylint: disable=too-few-public-methods
    COMMENT_REQUIRED = 0b01
    EVIDENCE_REQUIRED = 0b10

  VALID_TYPES = {
      "Text": "Text",
      "Rich Text": "Rich Text",
      "Dropdown": "Dropdown",
      "Checkbox": "Checkbox",
      "Date": "Date",
      "Person": "Map:Person",
  }

  @validates("attribute_type")
  def validate_attribute_type(self, _, value):
    """Check that provided attribute_type is allowed."""
    if value not in self.VALID_TYPES.values():
      raise ValidationError("Invalid attribute_type: got {v}, "
                            "expected one of {l}"
                            .format(v=value,
                                    l=list(self.VALID_TYPES.values())))
    return value

  @validates("multi_choice_options")
  def validate_multi_choice_options(self, _, value):
    """Strip spaces around options in dropdown options."""
    # pylint: disable=no-self-use
    # TODO: this should be "if value is not None" to disallow value == ""
    if value:
      value_list = [part.strip() for part in value.split(",")]
      value_set = set(value_list)
      if len(value_set) != len(value_list):
        raise ValidationError("Duplicate dropdown options are not allowed: "
                              "'{}'".format(value))
      if "" in value_set:
        raise ValidationError("Empty dropdown options are not allowed: '{}'"
                              .format(value))
      value = ",".join(value_list)

    return value

  @validates("multi_choice_mandatory")
  def validate_multi_choice_mandatory(self, _, value):
    """Strip spaces around bitmas in dropdown options."""
    # pylint: disable=no-self-use
    if value:
      value = ",".join(part.strip() for part in value.split(","))

    return value

  def validate_assessment_title(self, name):
    """Check assessment title uniqueness.

    Assessment CAD should not match any name from assessment_template.
    Currently assessment templates do not have global custom attributes, but
    in the future global CAD on assessment templates could be applied to all
    generated assessments. That's why we do not differentiate between global
    and local CAD here.

    Args:
      name: Assessment custom attribute definition title.
    Raises:
      ValueError if name is an invalid CAD title.
    """
    if self.definition_id:
      # Local Assessment CAD can match local and global Assessment Template
      # CAD.
      # NOTE: This is not the best way of checking if the current CAD is local,
      # since it relies on the fact that if definition_id will be set, it will
      # be set along with definition_type. If we manually set definition_type
      # then title then definition_id, this check would fail.
      return

    if not getattr(flask.g, "template_cad_names", set()):
      query = db.session.query(self.__class__.title).filter(
          self.__class__.definition_type == "assessment_template"
      )
      flask.g.template_cad_names = {cad.title.lower() for cad in query}

    if name in flask.g.template_cad_names:
      raise ValueError(u"Local custom attribute '{}' "
                       u"already exists for this object type."
                       .format(name))

  @validates("title", "definition_type")
  def validate_title(self, key, value):
    """Validate CAD title/name uniqueness.

    Note: title field is used for storing CAD names.
    CAD names need to follow 4 uniqueness rules:
      1) Names must not match any attribute name on any existing object.
      2) Object level CAD names must not match any global CAD name.
      3) Object level CAD names can clash, but not for the same Object
         instance. This means we can have two CAD with a name "my cad", with
         different attributable_id fields.
      4) Names must not match any existing custom attribute role name

    Third rule is handled by the database with unique key uq_custom_attribute
    (`definition_type`,`definition_id`,`title`).

    This validator should check for name collisions for 1st and 2nd rule.

    This validator works, because definition_type is never changed. It only
    gets set when the cad is created and after that only title filed can
    change. This makes validation using both fields possible.

    Args:
      value: custom attribute definition name

    Returns:
      value if the name passes all uniqueness checks.
    """

    if key == "title" and self.definition_type:
      name = value.lower()
      definition_type = self.definition_type
    elif key == "definition_type" and self.title:
      name = self.title.lower()
      definition_type = value.lower()
    else:
      return value

    if name in self._get_reserved_names(definition_type):
      raise ValueError(u"Attribute '{}' is reserved for this object type."
                       .format(name))

    if (self._get_global_cad_names(definition_type).get(name) is not None and
            self._get_global_cad_names(definition_type).get(name) != self.id):
      raise ValueError(u"Global custom attribute '{}' "
                       u"already exists for this object type"
                       .format(name))

    if name in self._get_custom_roles(definition_type):
      raise ValueError(u"Custom Role with a name of '{}' "
                       u"already existsfor this object type".format(name))

    if definition_type == "assessment":
      self.validate_assessment_title(name)

    return value


class CustomAttributeMapable(object):
  # pylint: disable=too-few-public-methods
  # because this is a mixin

  @declared_attr
  def related_custom_attributes(self):
    """CustomAttributeValues that directly map to this object.

    Used just to get the backrefs on the CustomAttributeValue object.

    Returns:
       a sqlalchemy relationship
    """
    return db.relationship(
        'CustomAttributeValue',
        primaryjoin=lambda: (
            (CustomAttributeValue.attribute_value == self.__name__) &
            (CustomAttributeValue.attribute_object_id == self.id)),
        foreign_keys="CustomAttributeValue.attribute_object_id",
        backref='attribute_{0}'.format(self.__name__),
        viewonly=True)
