/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import Cacheable from '../cacheable';

export default Cacheable('CMS.Models.TaskGroup', {
  root_object: 'task_group',
  root_collection: 'task_groups',
  category: 'workflow',
  findAll: 'GET /api/task_groups',
  findOne: 'GET /api/task_groups/{id}',
  create: 'POST /api/task_groups',
  update: 'PUT /api/task_groups/{id}',
  destroy: 'DELETE /api/task_groups/{id}',
  mixins: ['contactable'],
  permalink_options: {
    url: '<%= base.viewLink %>#task_group/' +
    'task_group/<%= instance.id %>',
    base: 'workflow',
  },
  attributes: {
    workflow: 'CMS.Models.Workflow.stub',
    task_group_tasks: 'CMS.Models.TaskGroupTask.stubs',
    tasks: 'CMS.Models.Task.stubs',
    task_group_objects: 'CMS.Models.TaskGroupObject.stubs',
    objects: 'CMS.Models.get_stubs',
    modified_by: 'CMS.Models.Person.stub',
    context: 'CMS.Models.Context.stub',
    end_date: 'date',
  },

  tree_view_options: {
    attr_view: GGRC.mustache_path + '/task_groups/tree-item-attr.mustache',
    add_item_view: GGRC.mustache_path + '/task_groups/tree_add_item.mustache',
    mapper_attr_list: [
      {attr_title: 'Summary', attr_name: 'title'},
      {attr_title: 'Assignee', attr_name: 'assignee',
        attr_sort_field: 'contact'},
      {attr_title: 'Description', attr_name: 'description'},
    ],
    disable_columns_configuration: true,
  },

  init: function () {
    let that = this;
    if (this._super) {
      this._super(...arguments);
    }
    this.validateNonBlank('title');
    this.validateNonBlank('contact');
    this.validateNonBlank('workflow');
    this.validateContact(['_transient.contact', 'contact']);

    this.bind('updated', function (ev, instance) {
      if (instance instanceof that) {
        instance.refresh_all_force('workflow', 'context');
      }
    });
    this.bind('destroyed', function (ev, inst) {
      if (inst instanceof that) {
        inst.attr('deleted', true);
        can.each(inst.task_group_tasks, function (tgt) {
          if (!tgt) {
            return;
          }
          tgt = tgt.reify();
          can.trigger(tgt, 'destroyed');
          can.trigger(tgt.constructor, 'destroyed', tgt);
        });
        inst.refresh_all_force('workflow', 'context');
      }
    });
  },
}, {});
