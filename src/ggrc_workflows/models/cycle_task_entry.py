# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""A module containing the workflow CycleTaskEntry model."""


from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import backref

from ggrc import db
from ggrc.models.mixins import Base, Described
from ggrc.models import reflection

from ggrc.access_control import roleable
from ggrc.models.relationship import Relatable
from ggrc.fulltext import mixin
from ggrc.models.mixins import base


class CycleTaskEntry(roleable.Roleable, Relatable, Described,
                     base.ContextRBAC, Base, mixin.Indexed, db.Model):
  """Workflow CycleTaskEntry model."""

  __tablename__ = 'cycle_task_entries'

  _is_declining_review = db.Column(db.Boolean, nullable=True)

  cycle_id = db.Column(
      db.Integer,
      db.ForeignKey('cycles.id', ondelete="CASCADE"),
      nullable=False,
  )
  cycle_task_group_object_task_id = db.Column(
      db.Integer,
      db.ForeignKey('cycle_task_group_object_tasks.id', ondelete="CASCADE"),
      nullable=False,
  )
  # `cascade` option must be added on parent's (CycleTask's) side relationship.
  # Because we are using backref on child side, backref must initialize cascade
  # option explicitly for parent's (CycleTask's) part of the relationship.

  _api_attrs = reflection.ApiAttributes(
      'cycle',
      'cycle_task_group_object_task',
      'is_declining_review'
  )

  _cycle_task_group_object_task = db.relationship(
      'CycleTaskGroupObjectTask',
      foreign_keys='CycleTaskEntry.cycle_task_group_object_task_id',
      backref=backref('cycle_task_entries', cascade="delete, delete-orphan"),
  )

  @property
  def workflow(self):
    """Property which returns parent workflow object."""
    return self.cycle.workflow

  @hybrid_property
  def is_declining_review(self):
    return self._is_declining_review

  @is_declining_review.setter
  def is_declining_review(self, value):
    self._is_declining_review = bool(value)

  @hybrid_property
  def cycle_task_group_object_task(self):
    return self._cycle_task_group_object_task

  @cycle_task_group_object_task.setter
  def cycle_task_group_object_task(self, value):
    self._cycle_task_group_object_task = value
