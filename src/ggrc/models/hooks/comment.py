# Copyright (C) 2017 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""A module with Comment object creation hooks"""

from ggrc import db
from ggrc.login import get_current_user_id
from ggrc.models.all_models import Comment, ObjectOwner
from ggrc.services.signals import Restful


def init_hook():
  """Initialize all hooks"""
  # pylint: disable=unused-variable

  @Restful.collection_posted.connect_via(Comment)
  def handle_comment_post(sender, objects=None, **kwargs):
    """Save information on which user created the Comment object."""
    # pylint: disable=unused-argument
    creator_id = get_current_user_id()
    for obj in objects:
      obj_owner = ObjectOwner(
          person_id=creator_id,
          ownable=obj,
      )
      db.session.add(obj_owner)
