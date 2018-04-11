# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Contains the WithAutoDeprecation mixin.

Allows to automatically move object to Deprecated
state when delete relationship (un mapping)
"""

from ggrc.models import relationship
from ggrc.services import signals


class WithAutoDeprecation(object):
  """Mixin for Change status of object to DEPRECATED on unmap"""
  __lazy_init__ = True

  UNMAP_FROM_TYPES = {'Audit', 'Assessment'}

  @classmethod
  def init(cls, model):
    """Initialization method to run after models have been initialized."""
    cls.set_handlers(model)

  @classmethod
  def set_handlers(cls, model):
    """Sets up handlers"""

    # pylint: disable=unused-argument
    @signals.Restful.model_deleted.connect_via(relationship.Relationship)
    def move_to_deprecated(sender, obj=None, src=None, service=None):
      """Move object to DEPRECATED state when delete relationship"""
      if (obj.source.type == model.__name__ and
              obj.destination.type in model.UNMAP_FROM_TYPES):
        obj.source.status = model.DEPRECATED
      elif (obj.destination.type == model.__name__ and
              obj.source.type in model.UNMAP_FROM_TYPES):
        obj.destination.status = model.DEPRECATED
