/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Cacheable from '../cacheable';
import Permission from '../../permission';
import '../mixins/is-overdue';

function refreshAttr(instance, attr) {
  let result;
  if (instance.attr(attr).reify().selfLink) {
    result = instance.attr(attr).reify().refresh();
  } else {
    result = can.Deferred().resolve();
  }

  return result;
}

function refreshAttrWrap(attr) {
  return function (ev, instance) {
    if (instance instanceof this) {
      Permission.refresh();
      refreshAttr(instance, attr);
    }
  };
}

export default Cacheable('CMS.Models.Cycle', {
  root_object: 'cycle',
  root_collection: 'cycles',
  category: 'workflow',
  findAll: 'GET /api/cycles',
  findOne: 'GET /api/cycles/{id}',
  create: 'POST /api/cycles',
  update: 'PUT /api/cycles/{id}',
  destroy: 'DELETE /api/cycles/{id}',
  mixins: ['isOverdue'],
  attributes: {
    workflow: 'CMS.Models.Workflow.stub',
    cycle_task_groups: 'CMS.Models.CycleTaskGroup.stubs',
    modified_by: 'CMS.Models.Person.stub',
    context: 'CMS.Models.Context.stub',
  },
  tree_view_options: {
    draw_children: true,
    attr_list: [{
      attr_title: 'Title',
      attr_name: 'title',
      order: 10,
    }, {
      attr_title: 'State ',
      attr_name: 'status',
      order: 15,
    }, {
      attr_title: 'End Date',
      attr_name: 'end_date',
      order: 20,
    }],
    mandatory_attr_name: ['title', 'status', 'end_date'],
    disable_columns_configuration: true,
  },
  init: function () {
    let that = this;
    this._super(...arguments);
    this.bind('created', refreshAttrWrap('workflow').bind(this));
    this.bind('destroyed', function (ev, inst) {
      if (inst instanceof that) {
        can.each(inst.cycle_task_groups, function (cycleTaskGroup) {
          if (!cycleTaskGroup) {
            return;
          }
          cycleTaskGroup = cycleTaskGroup.reify();
          can.trigger(cycleTaskGroup, 'destroyed');
          can.trigger(
            cycleTaskGroup.constructor, 'destroyed', cycleTaskGroup);
        });
      }
    });
  },
}, {
  init: function () {
    this._super(...arguments);
  },
});
