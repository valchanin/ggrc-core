# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Module contains BeforeFlushHandleable mixin."""

from sqlalchemy import event
from sqlalchemy.orm import session


class BeforeFlushHandleable(object):
  """A mixin for handling before_flush sqlalchemy events.

  Used if you need to handle object in a before flush state.
  e.g if needed to validate object when all fields are filled.
  """

  # pylint: disable=too-few-public-methods
  def handle_before_flush(self):
    """Override with custom handling"""
    raise NotImplementedError()

  @classmethod
  def _loop_handler(cls, alchemy_session, flush_context, objects):
    """loop thought all object in session and call handler"""
    # pylint: disable=unused-argument

    for obj in alchemy_session:
      if isinstance(obj, BeforeFlushHandleable):
        obj.handle_before_flush()

# pylint: disable=protected-access
event.listen(session.Session, 'before_flush',
             BeforeFlushHandleable._loop_handler)
