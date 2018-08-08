# -*- coding: utf-8 -*-

# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""A module with functions for retrieving workflow objects data used in emails.
"""

import urllib

from collections import defaultdict
from copy import deepcopy
from datetime import date
from logging import getLogger
from urlparse import urljoin

from sqlalchemy import orm

from ggrc import db
from ggrc import utils
from ggrc.models.revision import Revision
from ggrc.notifications import data_handlers
from ggrc.utils import merge_dicts, get_url_root
from ggrc_workflows.models import Cycle
from ggrc_workflows.models import CycleTaskGroupObjectTask
from ggrc_workflows.models import Workflow


# pylint: disable=invalid-name
logger = getLogger(__name__)


"""
exposed functions
    get_cycle_data,
    get_workflow_data,
    get_cycle_task_data,
"""


def get_cycle_created_task_data(notification):
  cycle_task = get_object(CycleTaskGroupObjectTask, notification.object_id)
  if not cycle_task:
    logger.warning(
        '%s for notification %s not found.',
        notification.object_type, notification.id)
    return {}

  cycle_task_group = cycle_task.cycle_task_group
  cycle = cycle_task_group.cycle

  force = cycle.workflow.notify_on_change

  task_assignees = set().union(
      cycle_task.get_persons_for_rolename("Task Assignees"),
      cycle_task.get_persons_for_rolename("Task Secondary Assignees"))
  task_group_assignee = data_handlers.get_person_dict(cycle_task_group.contact)
  workflow_admins = get_workflow_admins_dict(cycle.workflow)
  task = {
      cycle_task.id: get_cycle_task_dict(cycle_task)
  }

  result = {
      task_group_assignee['email']: {
          "user": task_group_assignee,
          "force_notifications": {
              notification.id: force
          },
          "cycle_data": {
              cycle.id: {
                  "my_task_groups": {
                      cycle_task_group.id: deepcopy(task)
                  }
              }
          }
      }
  }
  for task_assignee in task_assignees:
    assignee_data = {
        task_assignee.email: {
            "user": data_handlers.get_person_dict(task_assignee),
            "force_notifications": {
                notification.id: force
            },
            "cycle_data": {
                cycle.id: {
                    "my_tasks": deepcopy(task)
                }
            }
        }
    }
    result = merge_dicts(result, assignee_data)
  for workflow_admin in workflow_admins.itervalues():
    wf_admin_data = {
        workflow_admin['email']: {
            "user": workflow_admin,
            "force_notifications": {
                notification.id: force
            },
            "cycle_data": {
                cycle.id: {
                    "cycle_tasks": deepcopy(task)
                }
            }
        }
    }
    result = merge_dicts(result, wf_admin_data)
  return result


def get_cycle_task_due(notification, tasks_cache=None, del_rels_cache=None):
  """Build data needed for the "task due" email notifications.

  Args:
    notification (Notification): The notification to aggregate the data for.
    tasks_cache (dict): prefetched CycleTaskGroupObjectTask instances
      accessible by their ID as a key
    del_rels_cache (dict): prefetched Revision instances representing the
      relationships to Tasks that were deleted grouped by task ID as a key
  Returns:
    Data aggregated in a dictionary, grouped by task
    assignee/secondary assignee's email address, which is used as a key.
  """
  if tasks_cache is None:
    tasks_cache = {}

  cycle_task = tasks_cache.get(notification.object_id)
  if not cycle_task:
    cycle_task = get_object(CycleTaskGroupObjectTask, notification.object_id)

  if not cycle_task:
    logger.warning(
        '%s for notification %s not found.',
        notification.object_type, notification.id)
    return {}
  task_assignees = set().union(
      cycle_task.get_persons_for_rolename("Task Assignees"),
      cycle_task.get_persons_for_rolename("Task Secondary Assignees"))
  if not task_assignees:
    logger.warning(
        'Contact for cycle task %s not found.',
        notification.object_id)
    return {}

  notif_name = notification.notification_type.name
  due = "due_today" if notif_name == "cycle_task_due_today" else "due_in"
  force = cycle_task.cycle_task_group.cycle.workflow.notify_on_change

  url_filter_exp = u"id={}".format(cycle_task.cycle_id)
  task_info = get_cycle_task_dict(cycle_task, del_rels_cache=del_rels_cache)

  task_info["task_group"] = cycle_task.cycle_task_group
  task_info["task_group_url"] = cycle_task_group_url(
      cycle_task, filter_exp=url_filter_exp)

  task_info["workflow"] = cycle_task.cycle.workflow
  task_info["workflow_cycle_url"] = cycle_task_workflow_cycle_url(
      cycle_task, filter_exp=url_filter_exp)

  result = {}
  for person in task_assignees:
    person_dict = {
        person.email: {
            "user": data_handlers.get_person_dict(person),
            "today": date.today(),
            "force_notifications": {
                notification.id: force
            },
            due: {
                cycle_task.id: task_info
            }
        }
    }
    result = merge_dicts(result, person_dict)
  return result


def get_cycle_task_overdue_data(
    notification, tasks_cache=None, del_rels_cache=None
):
  """Compile and return all relevant email data for task overdue notification.

  Args:
    notification: Notification instance for which to compile email data.
    tasks_cache (dict): prefetched CycleTaskGroupObjectTask instances
      accessible by their ID as a key
    del_rels_cache (dict): prefetched Revision instances representing the
      relationships to Tasks that were deleted grouped by task ID as a key
  Returns:
    Dictionary containing the compiled data under the key that equals the
    overdue task assignee/secondary assignee's email address.
  """
  if tasks_cache is None:
    tasks_cache = {}

  cycle_task = tasks_cache.get(notification.object_id)
  if not cycle_task:
    cycle_task = get_object(CycleTaskGroupObjectTask, notification.object_id)

  if not cycle_task:
    logger.warning(
        '%s for notification %s not found.',
        notification.object_type, notification.id)
    return {}
  assignees = set().union(
      cycle_task.get_persons_for_rolename("Task Assignees"),
      cycle_task.get_persons_for_rolename("Task Secondary Assignees"))
  if not assignees:
    logger.warning(
        'Contact for cycle task %s not found.',
        notification.object_id)
    return {}

  force = cycle_task.cycle_task_group.cycle.workflow.notify_on_change

  # the filter expression to be included in the cycle task's URL and
  # automatically applied when user visits it
  url_filter_exp = u"id=" + unicode(cycle_task.cycle_id)
  task_info = get_cycle_task_dict(cycle_task, del_rels_cache=del_rels_cache)

  task_info['task_group'] = cycle_task.cycle_task_group
  task_info['task_group_url'] = cycle_task_group_url(
      cycle_task, filter_exp=url_filter_exp)

  task_info['workflow'] = cycle_task.cycle.workflow
  task_info['workflow_cycle_url'] = cycle_task_workflow_cycle_url(
      cycle_task, filter_exp=url_filter_exp)
  result = {}
  for person in assignees:
    person_dict = {
        person.email: {
            "user": data_handlers.get_person_dict(person),
            "force_notifications": {
                notification.id: force
            },
            "task_overdue": {
                cycle_task.id: task_info
            }
        }
    }
    result = merge_dicts(result, person_dict)
  return result


def get_all_cycle_tasks_completed_data(notification, cycle):
  workflow_admins = get_workflow_admins_dict(cycle.workflow)
  force = cycle.workflow.notify_on_change
  result = {}

  for workflow_admin in workflow_admins.itervalues():
    wf_data = {
        workflow_admin['email']: {
            "user": workflow_admin,
            "today": date.today(),
            "force_notifications": {
                notification.id: force
            },
            "all_tasks_completed": {
                cycle.id: get_cycle_dict(cycle)
            }
        }
    }
    result = merge_dicts(result, wf_data)
  return result


def get_cycle_created_data(notification, cycle):
  if not cycle.is_current:
    return {}

  manual = notification.notification_type.name == "manual_cycle_created"
  force = cycle.workflow.notify_on_change
  result = {}

  people_with_role = (
      cycle.workflow.get_persons_for_rolename("Admin") +
      cycle.workflow.get_persons_for_rolename("Workflow Member"))
  for person in people_with_role:
    result[person.email] = {
        "user": data_handlers.get_person_dict(person),
        "force_notifications": {
            notification.id: force
        },
        "cycle_started": {
            cycle.id: get_cycle_dict(cycle, manual)
        }
    }
  return result


def get_cycle_data(notification):
  cycle = get_object(Cycle, notification.object_id)
  if not cycle:
    return {}

  notification_name = notification.notification_type.name
  if notification_name in ["manual_cycle_created", "cycle_created"]:
    return get_cycle_created_data(notification, cycle)
  elif notification_name == "all_cycle_tasks_completed":
    return get_all_cycle_tasks_completed_data(notification, cycle)

  return {}


def get_cycle_task_declined_data(notification):
  cycle_task = get_object(CycleTaskGroupObjectTask, notification.object_id)
  if cycle_task:
    assignees = set().union(
        cycle_task.get_persons_for_rolename("Task Assignees"),
        cycle_task.get_persons_for_rolename("Task Secondary Assignees"))
  else:
    assignees = []
  if not assignees:
    logger.warning(
        '%s for notification %s not found.',
        notification.object_type, notification.id)
    return {}

  force = cycle_task.cycle_task_group.cycle.workflow.notify_on_change
  result = {}
  for person in assignees:
    person_dict = {
        person.email: {
            "user": data_handlers.get_person_dict(person),
            "force_notifications": {
                notification.id: force
            },
            "task_declined": {
                cycle_task.id: get_cycle_task_dict(cycle_task)
            }
        }
    }
    result = merge_dicts(result, person_dict)
  return result


def cycle_tasks_cache(notifications):
  """Compile and return Task instances related to given notification records.

  Args:
    notifications: a list of Notification instances for which to fetch the
      corresponding CycleTaskGroupObjectTask instances
      accessible by their ID as a key
  Returns:
    Dictionary containing task instances with their IDs used as keys.
  """
  task_ids = [n.object_id for n in notifications
              if n.object_type == "CycleTaskGroupObjectTask"]

  if not task_ids:
    return {}

  results = db.session\
      .query(CycleTaskGroupObjectTask)\
      .options(
          orm.joinedload("related_sources"),
          orm.joinedload("related_destinations")
      )\
      .filter(CycleTaskGroupObjectTask.id.in_(task_ids))

  return {task.id: task for task in results}


def deleted_task_rels_cache(task_ids):
  """Compile and return deleted Relationships information for given Tasks.

  Args:
    task_ids: a list of CycleTaskGroupObjectTask IDs for which to fetch
      revisions of deleted Relationships
  Returns:
      Dictionary containing Revision instances grouped by Task IDs as keys.
  """
  rels_cache = defaultdict(list)

  if not task_ids:
    deleted_relationships = []
  else:
    deleted_relationships_sources = db.session.query(Revision).filter(
        Revision.resource_type == "Relationship",
        Revision.action == "deleted",
        Revision.source_type == "CycleTaskGroupObjectTask",
        Revision.source_id.in_(task_ids)
    )
    deleted_relationships_destinations = db.session.query(Revision).filter(
        Revision.resource_type == "Relationship",
        Revision.action == "deleted",
        Revision.destination_type == "CycleTaskGroupObjectTask",
        Revision.destination_id.in_(task_ids)
    )
    deleted_relationships = deleted_relationships_sources.union(
        deleted_relationships_destinations).all()

  # group relationships by their corresponding Task ID
  for rel in deleted_relationships:
    if rel.source_type == "CycleTaskGroupObjectTask":
      task_id = rel.source_id
    else:
      task_id = rel.destination_id
    rels_cache[task_id].append(rel)

  return rels_cache


def get_cycle_task_data(notification, tasks_cache=None, del_rels_cache=None):
  if tasks_cache is None:
    tasks_cache = {}

  cycle_task = tasks_cache.get(notification.object_id)
  if not cycle_task:
    cycle_task = get_object(CycleTaskGroupObjectTask, notification.object_id)

  if not cycle_task or not cycle_task.cycle_task_group.cycle.is_current:
    return {}

  notification_name = notification.notification_type.name
  if notification_name in ["manual_cycle_created", "cycle_created"]:
    return get_cycle_created_task_data(notification)
  elif notification_name == "cycle_task_declined":
    return get_cycle_task_declined_data(notification)
  elif notification_name.endswith("cycle_task_due_in"):
    return get_cycle_task_due(
        notification, tasks_cache=tasks_cache, del_rels_cache=del_rels_cache)
  elif "cycle_task_due_today" == notification_name:
    return get_cycle_task_due(
        notification, tasks_cache=tasks_cache, del_rels_cache=del_rels_cache)
  elif notification_name == "cycle_task_overdue":
    return get_cycle_task_overdue_data(
        notification, tasks_cache=tasks_cache, del_rels_cache=del_rels_cache)

  return {}


def get_workflow_starts_in_data(notification, workflow):
  if workflow.status != "Active":
    return {}
  if (not workflow.next_cycle_start_date or
          workflow.next_cycle_start_date < date.today()):
    return {}  # this can only be if the cycle has successfully started
  result = {}

  force = workflow.notify_on_change

  people_with_role = (
      workflow.get_persons_for_rolename("Admin") +
      workflow.get_persons_for_rolename("Workflow Member"))
  for wf_person in people_with_role:
    result[wf_person.email] = {
        "user": data_handlers.get_person_dict(wf_person),
        "force_notifications": {
            notification.id: force
        },
        "cycle_starts_in": {
            workflow.id: {
                "workflow_url": get_workflow_url(workflow),
                "start_date": workflow.next_cycle_start_date,
                "start_date_statement": utils.get_digest_date_statement(
                    workflow.next_cycle_start_date, "start", True),
                "custom_message": workflow.notify_custom_message,
                "title": workflow.title,
            }
        }
    }
  return result


def get_cycle_start_failed_data(notification, workflow):
  if workflow.status != "Active":
    return {}
  if (not workflow.next_cycle_start_date or
          workflow.next_cycle_start_date >= date.today()):
    return {}  # this can only be if the cycle has successfully started

  result = {}
  workflow_admins = get_workflow_admins_dict(workflow)
  force = workflow.notify_on_change

  for wf_admin in workflow_admins.itervalues():
    result[wf_admin["email"]] = {
        "user": wf_admin,
        "force_notifications": {
            notification.id: force
        },
        "cycle_start_failed": {
            workflow.id: {
                "workflow_url": get_workflow_url(workflow),
                "start_date": workflow.next_cycle_start_date,
                "start_date_statement": utils.get_digest_date_statement(
                    workflow.next_cycle_start_date, "start", True),
                "custom_message": workflow.notify_custom_message,
                "title": workflow.title,
            }
        }
    }
  return result


def get_workflow_data(notification):
  workflow = get_object(Workflow, notification.object_id)
  if not workflow:
    return {}

  if workflow.unit is None:
    # one time workflows get cycles manually created and that triggers
    # the instant notification.
    return {}

  if "_workflow_starts_in" in notification.notification_type.name:
    return get_workflow_starts_in_data(notification, workflow)
  if "cycle_start_failed" == notification.notification_type.name:
    return get_cycle_start_failed_data(notification, workflow)

  return {}


def get_object(obj_class, obj_id):
  result = db.session.query(obj_class).filter(obj_class.id == obj_id)
  if result.count() == 1:
    return result.one()
  return None


def get_workflow_admins_dict(workflow):
  wfa_people = workflow.get_persons_for_rolename("Admin")
  return {person.id: data_handlers.get_person_dict(person)
          for person in wfa_people}


def _get_object_info_from_revision(revision, known_type):
  """ returns type and id of the searched object, if we have one part of
  the relationship known.
  """
  object_type = revision.destination_type \
      if revision.source_type == known_type \
      else revision.source_type
  object_id = revision.destination_id if \
      revision.source_type == known_type \
      else revision.source_id
  return object_type, object_id


def get_cycle_task_dict(cycle_task, del_rels_cache=None):

  object_titles = []
  # every object should have a title or at least a name like person object
  for related_object in cycle_task.related_objects():
    object_titles.append(getattr(related_object, "title", "") or
                         getattr(related_object, "name", "") or
                         u"Untitled object")

  # related objects might have been deleted or unmapped,
  # check the revision history
  if del_rels_cache is not None:
    deleted_relationships = del_rels_cache.get(cycle_task.id, [])
  else:
    deleted_relationships_sources = db.session.query(Revision).filter(
        Revision.resource_type == "Relationship",
        Revision.action == "deleted",
        Revision.source_type == "CycleTaskGroupObjectTask",
        Revision.source_id == cycle_task.id
    )
    deleted_relationships_destinations = db.session.query(Revision).filter(
        Revision.resource_type == "Relationship",
        Revision.action == "deleted",
        Revision.destination_type == "CycleTaskGroupObjectTask",
        Revision.destination_id == cycle_task.id
    )
    deleted_relationships = deleted_relationships_sources.union(
        deleted_relationships_destinations).all()

  for deleted_relationship in deleted_relationships:
    removed_object_type, removed_object_id = _get_object_info_from_revision(
        deleted_relationship, "CycleTaskGroupObjectTask")
    object_data = db.session.query(Revision).filter(
        Revision.resource_type == removed_object_type,
        Revision.resource_id == removed_object_id,
    ).order_by(Revision.id.desc()).first()

    object_titles.append(
        u"{} [removed from task]".format(object_data.content["display_name"])
    )

  return {
      "title": cycle_task.title,
      "related_objects": object_titles,
      "end_date": cycle_task.end_date.strftime("%m/%d/%Y"),
      "due_date_statement": utils.get_digest_date_statement(
          cycle_task.end_date, "due"),
      "cycle_task_url": get_cycle_task_url(),
  }


def get_cycle_dict(cycle, manual=False):
  return {
      "manually": manual,
      "custom_message": cycle.workflow.notify_custom_message,
      "cycle_slug": cycle.slug,
      "cycle_title": cycle.title,
      "cycle_url": cycle.cycle_url,
      "cycle_inactive_url": cycle.cycle_inactive_url,
  }


def get_workflow_url(workflow):
  url = "workflows/{}#current".format(workflow.id)
  return urljoin(get_url_root(), url)


def get_cycle_task_url():
  """Get CycleTask notification url."""
  return urljoin(get_url_root(), u"dashboard#!task")


def cycle_task_group_url(cycle_task, filter_exp=u""):
  """Build the URL to a particular cycle task.

  Args:
    cycle_task: The cycle task instance to build the URL for.
    filter_exp:
        An optional query filter expression to be included in the URL.
        Defaults to an empty string.
  Returns:
    Full cycle task URL (as a string).
  """
  if filter_exp:
    filter_exp = u"?filter=" + urllib.quote(filter_exp)

  url = (u"/workflows/{workflow_id}"
         u"{filter_exp}"
         u"#current/cycle/{cycle_id}"
         u"/cycle_task_group/{cycle_task_group_id}").format(
      workflow_id=cycle_task.cycle_task_group.cycle.workflow.id,
      filter_exp=filter_exp,
      cycle_id=cycle_task.cycle_task_group.cycle.id,
      cycle_task_group_id=cycle_task.cycle_task_group.id,
  )
  return urljoin(get_url_root(), url)


def cycle_task_workflow_cycle_url(cycle_task, filter_exp=u""):
  """Build the URL to the given task's workflow cycle.

  Args:
    cycle_task: The cycle task instance to build the URL for.
    filter_exp:
        An optional query filter expression to be included in the URL.
        Defaults to an empty string.
  Returns:
    Full workflow cycle URL (as a string).
  """
  if filter_exp:
    filter_exp = u"?filter=" + urllib.quote(filter_exp)

  url = (u"/workflows/{workflow_id}"
         u"{filter_exp}"
         u"#current/cycle/{cycle_id}").format(
      workflow_id=cycle_task.cycle_task_group.cycle.workflow.id,
      filter_exp=filter_exp,
      cycle_id=cycle_task.cycle_task_group.cycle.id,
  )
  return urljoin(get_url_root(), url)
