/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Cacheable from '../cacheable';
import '../mixins/is-overdue';

export default Cacheable('CMS.Models.CycleTaskGroup', {
  root_object: 'cycle_task_group',
  root_collection: 'cycle_task_groups',
  category: 'workflow',
  findAll: 'GET /api/cycle_task_groups',
  findOne: 'GET /api/cycle_task_groups/{id}',
  create: 'POST /api/cycle_task_groups',
  update: 'PUT /api/cycle_task_groups/{id}',
  destroy: 'DELETE /api/cycle_task_groups/{id}',
  mixins: ['isOverdue'],
  attributes: {
    cycle: 'CMS.Models.Cycle.stub',
    task_group: 'CMS.Models.TaskGroup.stub',
    cycle_task_group_tasks: 'CMS.Models.CycleTaskGroupObjectTask.stubs',
    modified_by: 'CMS.Models.Person.stub',
    context: 'CMS.Models.Context.stub',
  },

  tree_view_options: {
    draw_children: true,
  },

  init: function () {
    let that = this;
    this._super(...arguments);

    this.validateNonBlank('contact');
    this.validateContact(['_transient.contact', 'contact']);
    this.bind('updated', function (ev, instance) {
      let dfd;
      if (instance instanceof that) {
        dfd = instance.refresh_all_force('cycle', 'workflow');
        dfd.then(function () {
          return $.when(
            instance.refresh_all_force('related_objects'),
            instance.refresh_all_force('cycle_task_group_tasks')
          );
        });
      }
    });
    this.bind('destroyed', function (ev, inst) {
      if (inst instanceof that) {
        can.each(inst.cycle_task_group_tasks, function (ctgt) {
          if (!ctgt) {
            return;
          }
          ctgt = ctgt.reify();
          can.trigger(ctgt, 'destroyed');
          can.trigger(ctgt.constructor, 'destroyed', ctgt);
        });
      }
    });
  },
}, {});
