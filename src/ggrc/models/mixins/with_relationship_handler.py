from ggrc.models import relationship
from ggrc.services import signals


class WithRelationshipHandler(object):

  """Mixin for handle relationship created/deleted event"""
  __lazy_init__ = True

  @classmethod
  def init(cls, model):
    """Initialization method to run after models have been initialized."""
    cls.set_handlers(model)

  def handle_relationship_created(self, target):
    """Override with custom handling"""
    pass

  def handle_relationship_deleted(self, target):
    """Override with custom handling"""
    pass

  @classmethod
  def set_handlers(cls, model):
    """Sets up handlers"""

    # pylint: disable=unused-argument
    @signals.Restful.model_deleted.connect_via(relationship.Relationship)
    def handle_object_unmapping(sender, obj=None, src=None, service=None):
      if obj.source_type == model.__name__:
        model.handle_relationship_deleted(obj.source, obj.destination)
      elif obj.destination_type == model.__name__:
        model.handle_relationship_deleted(obj.destination, obj.source)

    # pylint: disable=unused-argument
    @signals.Restful.collection_posted.connect_via(relationship.Relationship)
    def handle_object_mapping(sender, objects=None, **kwargs):
      for rel in objects:
        if rel.source_type == model.__name__:
          model.handle_relationship_created(rel.source, rel.destination)
        elif rel.destination_type == model.__name__:
          model.handle_relationship_created(rel.destination, rel.source)
