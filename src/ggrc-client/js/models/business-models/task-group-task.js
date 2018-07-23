/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import Cacheable from '../cacheable';
import {getRole} from '../../plugins/utils/acl-utils';
import {
  getClosestWeekday,
  getDate,
} from '../../plugins/utils/date-util';
import {getPageInstance} from '../../plugins/utils/current-page-utils';

export default Cacheable('CMS.Models.TaskGroupTask', {
  root_object: 'task_group_task',
  root_collection: 'task_group_tasks',
  findAll: 'GET /api/task_group_tasks',
  create: 'POST /api/task_group_tasks',
  update: 'PUT /api/task_group_tasks/{id}',
  destroy: 'DELETE /api/task_group_tasks/{id}',

  mixins: ['contactable', 'timeboxed', 'accessControlList'],
  permalink_options: {
    url: '<%= base.viewLink %>#task_group/' +
    'task_group/<%= instance.task_group.id %>',
    base: 'task_group:workflow',
  },
  attributes: {
    context: 'CMS.Models.Context.stub',
    modified_by: 'CMS.Models.Person.stub',
    task_group: 'CMS.Models.TaskGroup.stub',
  },
  tree_view_options: {
    attr_view: GGRC.mustache_path +
      '/task_group_tasks/tree-item-attr.mustache',
    mapper_attr_list: [
      {attr_title: 'Summary', attr_name: 'title'},
      {attr_title: 'Description', attr_name: 'description'},
    ],
    disable_columns_configuration: true,
    assigneeRoleName: 'Task Assignees',
    secondaryAssigneeRoleName: 'Task Secondary Assignees',
  },

  init: function () {
    let that = this;
    let assigneeRole = getRole('TaskGroupTask', 'Task Assignees');

    if (this._super) {
      this._super(...arguments);
    }
    this.validateNonBlank('title');

    // instance.attr('access_control_list')
    //   .replace(...) doesn't raise change event
    // that's why we subscribe on access_control_list.length
    this.validate('access_control_list.length', function () {
      let that = this;
      let hasAssignee = assigneeRole && _.some(that.access_control_list, {
        ac_role_id: assigneeRole.id,
      });

      if (!hasAssignee) {
        return 'No valid contact selected for assignee';
      }
    });

    this.validate(['start_date', 'end_date'], function () {
      let that = this;
      let workflow = getPageInstance();
      let datesAreValid = true;
      let startDate = getDate(that.attr('start_date'));
      let endDate = getDate(that.attr('end_date'));

      if (!(workflow instanceof CMS.Models.Workflow)) {
        return;
      }

      // Handle cases of a workflow with start and end dates
      datesAreValid = startDate && endDate &&
        startDate <= endDate;

      if (!datesAreValid) {
        return 'Start and/or end date is invalid';
      }
    });

    this.bind('created', function (ev, instance) {
      if (instance instanceof that) {
        if (instance.task_group.reify().selfLink) {
          instance._refresh_workflow_people();
        }
      }
    });

    this.bind('updated', function (ev, instance) {
      if (instance instanceof that) {
        instance._refresh_workflow_people();
      }
    });

    this.bind('destroyed', function (ev, instance) {
      let taskGroup;
      if (instance instanceof that) {
        taskGroup = instance.task_group && instance.task_group.reify();
        if (taskGroup
          && taskGroup.selfLink
          && !taskGroup.attr('deleted')) {
          instance.task_group.reify().refresh();
          instance._refresh_workflow_people();
        }
      }
    });
  },
}, {
  init: function () {
    // default start and end date
    let startDate = this.attr('start_date') || new Date();
    let endDate = this.attr('end_date') ||
      new Date(moment().add(7, 'days').format());
    if (this._super) {
      this._super(...arguments);
    }

    startDate = getClosestWeekday(startDate);
    endDate = getClosestWeekday(endDate);
    // Add base values to this property
    this.attr('response_options', []);
    this.attr('start_date', startDate);
    this.attr('end_date', endDate);
    this.attr('minStartDate', new Date());
  },
  _refresh_workflow_people: function () {
    //  TaskGroupTask assignment may add mappings and role assignments in
    //  the backend, so ensure these changes are reflected.
    let workflow;
    let taskGroup = this.task_group.reify();
    if (taskGroup.selfLink) {
      workflow = taskGroup.workflow.reify();
      return workflow.refresh();
    }
  },
});
