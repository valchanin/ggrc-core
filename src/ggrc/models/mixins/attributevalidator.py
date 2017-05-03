"""Attribute validatior"""

import flask
import ggrc.models
import ggrc.access_control
from ggrc import db
from ggrc.utils import benchmark
from ggrc.models.reflection import AttributeInfo


class AttributeValidator(object):
  """Adds methods needed for attribute name vaidation"""
  # pylint: disable=too-few-public-methods

  @classmethod
  def _get_reserved_names(cls, definition_type):
    """Get a list of all attribute names in all objects.

    On first call this function computes all possible names that can be used by
    any model and stores them in a static frozen set. All later calls just get
    this set.

    Returns:
      frozen set containing all reserved attribute names for the current
      object.
    """
    # pylint: disable=protected-access
    # The _inflector is a false positive in our app.
    with benchmark("Generate a list of all reserved attribute names"):
      if not cls._reserved_names.get(definition_type):
        definition_map = {model._inflector.table_singular: model
                          for model in ggrc.models.all_models.all_models}
        definition_map.update({model._inflector.model_singular: model
                              for model in ggrc.models.all_models.all_models})

        definition_model = definition_map.get(definition_type)
        if not definition_model:
          raise ValueError("Invalid definition type")

        aliases = AttributeInfo.gather_aliases(definition_model)
        cls._reserved_names[definition_type] = frozenset(
            (value["display_name"] if isinstance(
                value, dict) else value).lower()
            for value in aliases.values() if value
        )
      return cls._reserved_names[definition_type]

  @classmethod
  def _get_global_cad_names(cls, definition_type):
    """Get names of global cad for a given object"""
    cad = ggrc.models.custom_attribute_definition.CustomAttributeDefinition
    definition_types = [definition_type]
    if definition_type == "assessment_template":
      definition_types.append("assessment")
    if not getattr(flask.g, "global_cad_names", set()):
      query = db.session.query(cad.title, cad.id).filter(
          cad.definition_type.in_(definition_types),
          cad.definition_id.is_(None)
      )
      flask.g.global_cad_names = {name.lower(): id_ for name, id_ in query}
    return flask.g.global_cad_names

  @classmethod
  def _get_custom_roles(cls, definition_type):
    """Get all access control role names for the given object type"""
    if not getattr(flask.g, "global_role_names", set()):
      role = ggrc.access_control.role
      query = db.session.query(
          role.AccessControlRole.name,
          role.AccessControlRole.id).filter(
          role.AccessControlRole.object_type == definition_type
      )
      flask.g.global_role_names = {name.lower(): id_ for name, id_ in query}
    return flask.g.global_role_names
