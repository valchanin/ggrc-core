# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Module contains a workflow Cycle model
"""

from urlparse import urljoin

from sqlalchemy import orm, inspect
from sqlalchemy.ext import hybrid

from ggrc import db
from ggrc.fulltext import attributes as ft_attributes
from ggrc.fulltext import mixin as ft_mixin
from ggrc.models import mixins
from ggrc.models.mixins import base
from ggrc.models import reflection
from ggrc.utils import get_url_root
from ggrc import builder
from ggrc.access_control import roleable

from ggrc_workflows.models import mixins as wf_mixins


def _query_filtered_by_contact(person):
  """Returns cycle required to reindex for sent persons."""
  attrs = inspect(person).attrs
  if any([attrs["email"].history.has_changes(),
          attrs["name"].history.has_changes()]):
    return Cycle.query.filter(Cycle.contact_id == person.id)
  return []


class Cycle(roleable.Roleable,
            mixins.WithContact,
            wf_mixins.CycleStatusValidatedMixin,
            mixins.Timeboxed,
            mixins.Described,
            mixins.Titled,
            base.ContextRBAC,
            mixins.Slugged,
            mixins.Notifiable,
            ft_mixin.Indexed,
            db.Model):
  """Workflow Cycle model
  """

  __tablename__ = 'cycles'
  _title_uniqueness = False

  workflow_id = db.Column(
      db.Integer,
      db.ForeignKey('workflows.id', ondelete="CASCADE"),
      nullable=False,
  )
  cycle_task_groups = db.relationship(
      'CycleTaskGroup', backref='_cycle', cascade='all, delete-orphan')
  cycle_task_group_object_tasks = db.relationship(
      'CycleTaskGroupObjectTask', backref='cycle',
      cascade='all, delete-orphan')
  cycle_task_entries = db.relationship(
      'CycleTaskEntry', backref='cycle', cascade='all, delete-orphan')
  is_current = db.Column(db.Boolean,
                         default=True,
                         nullable=False)
  next_due_date = db.Column(db.Date)

  @hybrid.hybrid_property
  def workflow(self):
    return self._workflow

  @workflow.setter
  def workflow(self, workflow):
    self._workflow = workflow

  @property
  def is_done(self):
    """Check if cycle's done

    Overrides StatusValidatedMixin method because cycle's is_done state
    depends on is_verification_needed flag
    """
    if super(Cycle, self).is_done:
      return True
    if self.cycle_task_group_object_tasks:
      return False
    return True

  @builder.simple_property
  def folder(self):
    """Get the workflow folder."""
    if self.workflow:
      return self.workflow.folder
    return ""

  _api_attrs = reflection.ApiAttributes(
      'workflow',
      'cycle_task_groups',
      'is_current',
      'next_due_date',
      reflection.Attribute('folder', create=False, update=False),
  )

  _aliases = {
      "cycle_workflow": {
          "display_name": "Workflow",
          "filter_by": "_filter_by_cycle_workflow",
      },
      "contact": "Assignee",
      "secondary_contact": None,
  }

  PROPERTY_TEMPLATE = u"cycle {}"

  _fulltext_attrs = [
      ft_attributes.DateFullTextAttr("due date", "next_due_date"),
      "folder",
  ]

  @property
  def _task_assignees(self):
    """Property. Return the list of persons as assignee of related tasks."""
    people = set()
    for ctask in self.cycle_task_group_object_tasks:
      people.update(ctask.get_persons_for_rolename("Task Assignees"))
    return list(people)

  @property
  def _task_secondary_assignees(self):
    """Property. Returns people list as Secondary Assignee of related tasks."""
    people = set()
    for ctask in self.cycle_task_group_object_tasks:
      people.update(ctask.get_persons_for_rolename("Task Secondary Assignees"))
    return list(people)

  AUTO_REINDEX_RULES = [
      ft_mixin.ReindexRule("Person", _query_filtered_by_contact),
  ]

  @classmethod
  def _filter_by_cycle_workflow(cls, predicate):
    """Filter by cycle workflow."""
    from ggrc_workflows.models.workflow import Workflow
    return Workflow.query.filter(
        (Workflow.id == cls.workflow_id) &
        (predicate(Workflow.slug) | predicate(Workflow.title))
    ).exists()

  @classmethod
  def eager_query(cls):
    """Add cycle task groups to cycle eager query

    This function adds cycle_task_groups as a join option when fetching cycles,
    and makes sure we fetch all cycle related data needed for generating cycle
    json, in one query.

    Returns:
      a query object with cycle_task_groups added to joined load options.
    """
    query = super(Cycle, cls).eager_query()
    return query.options(
        orm.joinedload('cycle_task_groups'),
        orm.Load(cls).joinedload("workflow").undefer_group(
            "Workflow_complete"
        ),
    )

  @classmethod
  def indexed_query(cls):
    return super(Cycle, cls).indexed_query().options(
        orm.Load(cls).load_only("next_due_date"),
        orm.Load(cls).joinedload("workflow").undefer_group(
            "Workflow_complete"
        ),
    )

  def _get_cycle_url(self, widget_name):
    return urljoin(
        get_url_root(),
        "workflows/{workflow_id}#{widget_name}/cycle/{cycle_id}".format(
            workflow_id=self.workflow.id,
            cycle_id=self.id,
            widget_name=widget_name
        )
    )

  @property
  def cycle_url(self):
    return self._get_cycle_url("current")

  @property
  def cycle_inactive_url(self):
    return self._get_cycle_url("history")

  def log_json(self):
    out_json = super(Cycle, self).log_json()
    out_json["folder"] = self.folder
    return out_json
