# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Resource for handling special endpoints for people."""

import datetime
import collections

from werkzeug.exceptions import Forbidden

from ggrc import db
from ggrc import login
from ggrc import models
from ggrc.utils import benchmark
from ggrc.services import common
from ggrc.query import my_objects
from ggrc.query import builder


class PersonResource(common.ExtendedResource):
  """Resource handler for people."""

  # method post is abstract and not used.
  # pylint: disable=abstract-method

  MY_WORK_OBJECTS = {
      "Issue": 0,
      "AccessGroup": 0,
      "Assessment": 0,
      "Audit": 0,
      "Clause": 0,
      "Contract": 0,
      "Control": 0,
      "DataAsset": 0,
      "Document": 0,
      "Evidence": 0,
      "Facility": 0,
      "Market": 0,
      "Objective": 0,
      "OrgGroup": 0,
      "Policy": 0,
      "Process": 0,
      "Product": 0,
      "Program": 0,
      "Project": 0,
      "Regulation": 0,
      "Risk": 0,
      "Section": 0,
      "Standard": 0,
      "System": 0,
      "Threat": 0,
      "Vendor": 0,
      "CycleTaskGroupObjectTask": 0,
  }

  ALL_OBJECTS = {
      "Issue": 0,
      "AccessGroup": 0,
      "Assessment": 0,
      "Audit": 0,
      "Clause": 0,
      "Contract": 0,
      "Control": 0,
      "DataAsset": 0,
      "Document": 0,
      "Evidence": 0,
      "Facility": 0,
      "Market": 0,
      "Objective": 0,
      "OrgGroup": 0,
      "Policy": 0,
      "Process": 0,
      "Product": 0,
      "Program": 0,
      "Project": 0,
      "Regulation": 0,
      "Risk": 0,
      "Section": 0,
      "Standard": 0,
      "System": 0,
      "Threat": 0,
      "Vendor": 0,
      "CycleTaskGroupObjectTask": 0,
      "Workflow": 0,
  }

  def get(self, *args, **kwargs):
    # This is to extend the get request for additional data.
    # pylint: disable=arguments-differ
    command_map = {
        None: super(PersonResource, self).get,
        "task_count": self._task_count,
        "my_work_count": self._my_work_count,
        "all_objects_count": self._all_objects_count,
    }
    command = kwargs.pop("command", None)
    if command not in command_map:
      self.not_found_response()
    return command_map[command](*args, **kwargs)

  def _task_count(self, id):
    """Return open task count and overdue flag for a given user."""
    # id name is used as a kw argument and can't be changed here
    # pylint: disable=invalid-name,redefined-builtin

    if id != login.get_current_user_id():
      raise Forbidden()
    with benchmark("Make response"):
      # query below ignores acr.read flag because this is done on a
      # non_editable role that has read rights:
      counts_query = db.session.execute(
          """
          SELECT
              overdue,
              sum(task_count)
          FROM (
              SELECT
                  ct.end_date < :today AS overdue,
                  count(ct.id) AS task_count
              FROM cycle_task_group_object_tasks AS ct
              JOIN cycles AS c ON
                  c.id = ct.cycle_id
              JOIN access_control_list AS acl
                  ON acl.object_id = ct.id
                  AND acl.object_type = "CycleTaskGroupObjectTask"
              JOIN access_control_roles as acr
                  ON acl.ac_role_id = acr.id
              WHERE
                  ct.status != "Verified" AND
                  c.is_verification_needed = 1 AND
                  c.is_current = 1 AND
                  acl.person_id = :person_id AND
                  acr.name IN ("Task Assignees", "Task Secondary Assignees")
              GROUP BY overdue

              UNION ALL

              SELECT
                  ct.end_date < :today AS overdue,
                  count(ct.id) AS task_count
              FROM cycle_task_group_object_tasks AS ct
              JOIN cycles AS c ON
                  c.id = ct.cycle_id
              JOIN access_control_list AS acl
                  ON acl.object_id = ct.id
                  AND acl.object_type = "CycleTaskGroupObjectTask"
              JOIN access_control_roles as acr
                  ON acl.ac_role_id = acr.id
              WHERE
                  ct.status != "Finished" AND
                  c.is_verification_needed = 0 AND
                  c.is_current = 1 AND
                  acl.person_id = :person_id AND
                  acr.name IN ("Task Assignees", "Task Secondary Assignees")
              GROUP BY overdue
          ) as temp
          GROUP BY overdue
          """,
          {
              # Using today instead of DATE(NOW()) for easier testing with
              # freeze gun.
              "today": datetime.date.today(),
              "person_id": id,
          }
      )
      counts = dict(counts_query.fetchall())
      response_object = {
          "open_task_count": int(sum(counts.values())),
          "has_overdue": bool(counts.get(1, 0)),
      }
      return self.json_success_response(response_object, )

  def _my_work_count(self, **kwargs):
    """Get object counts for my work page."""
    id_ = kwargs.get("id")
    if id_ != login.get_current_user_id():
      raise Forbidden()

    with benchmark("Make response"):
      aliased = my_objects.get_myobjects_query(
          types=self.MY_WORK_OBJECTS.keys(),
          contact_id=login.get_current_user_id()
      )
      all_ = db.session.query(
          aliased.c.type,
          aliased.c.id,
      )

      all_ids = collections.defaultdict(set)
      for type_, id_ in all_:
        all_ids[type_].add(id_)

      response_object = self.MY_WORK_OBJECTS.copy()
      for type_, ids in all_ids.items():
        model = models.get_model(type_)
        # pylint: disable=protected-access
        # We must move the type permissions query to a proper utility function
        # but we will not do that for a patch release
        permission_filter = builder.QueryHelper._get_type_query(model, "read")
        if permission_filter is not None:
          count = model.query.filter(
              model.id.in_(ids),
              permission_filter,
          ).count()
        else:
          count = model.query.filter(model.id.in_(ids)).count()
        response_object[type_] = count

      return self.json_success_response(response_object, )

  def _all_objects_count(self, **kwargs):
    """Get object counts for all objects page."""
    id_ = kwargs.get("id")
    user = login.get_current_user()
    if id_ != user.id:
      raise Forbidden()

    with benchmark("Make response"):

      response_object = self.ALL_OBJECTS.copy()
      for model_type in response_object:
        model = models.get_model(model_type)
        # pylint: disable=protected-access
        # We must move the type permissions query to a proper utility function
        # but we will not do that for a patch release
        permission_filter = builder.QueryHelper._get_type_query(model, "read")
        if permission_filter is not None:
          count = model.query.filter(permission_filter).count()
        else:
          count = model.query.count()
        response_object[model_type] = count

      return self.json_success_response(response_object, )
