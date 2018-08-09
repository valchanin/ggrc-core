# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
"""Tests for Workflow scope object Relationships."""
import ddt

from ggrc.models import all_models
from integration.ggrc.models import factories
from integration.ggrc_workflows.helpers import workflow_test_case
from integration.ggrc_workflows.helpers import relationship_api
from integration.ggrc_workflows.models import factories as wf_factories


@ddt.ddt
class TestRelationships(workflow_test_case.WorkflowTestCase):
  """Tests for Workflow scope object Relationships."""

  @ddt.data("Workflow", "TaskGroupTask", "TaskGroup")
  def test_cycle_task_model(self, model_name):
    """Test Relationship POST for CycleTask<->{0}.

    Args:
        model_name: Non-Relatable model with which we are trying to create
            Relationship.
    """
    with factories.single_commit():
      workflow = wf_factories.WorkflowFactory()
      cycle = wf_factories.CycleFactory(workflow=workflow)
      cycle_task_group = wf_factories.CycleTaskGroupFactory(cycle=cycle)
      task_group = wf_factories.TaskGroupFactory(workflow=workflow)
      task_group_task = wf_factories.TaskGroupTaskFactory(
          task_group=task_group
      )
      wf_factories.CycleTaskFactory(cycle=cycle,
                                    cycle_task_group=cycle_task_group,
                                    task_group_task=task_group_task)

    cycle_task = all_models.CycleTaskGroupObjectTask.query.one()
    instance = getattr(all_models, model_name).query.one()
    data_ct_src = relationship_api.get_relationship_post_dict(
        cycle_task, instance
    )
    data_ct_dst = relationship_api.get_relationship_post_dict(
        instance, cycle_task
    )

    response = self.api_helper.post(all_models.Relationship, data_ct_src)
    self.assertEqual(response.status_code, 201)

    response = self.api_helper.post(all_models.Relationship, data_ct_dst)
    self.assertEqual(response.status_code, 201)
