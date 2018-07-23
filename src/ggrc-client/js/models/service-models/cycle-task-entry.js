/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Cacheable from '../cacheable';
import tracker from '../../tracker';
import Permission from '../../permission';

const mustachePath = GGRC.mustache_path + '/cycle_task_entries';

function refreshAttr(instance, attr) {
  let result;
  if (instance.attr(attr).reify().selfLink) {
    result = instance.attr(attr).reify().refresh();
  } else {
    result = can.Deferred().resolve();
  }
  return result;
}

export default Cacheable('CMS.Models.CycleTaskEntry', {
  root_object: 'cycle_task_entry',
  root_collection: 'cycle_task_entries',
  category: 'workflow',
  findAll: 'GET /api/cycle_task_entries',
  findOne: 'GET /api/cycle_task_entries/{id}',
  create: 'POST /api/cycle_task_entries',
  update: 'PUT /api/cycle_task_entries/{id}',
  destroy: 'DELETE /api/cycle_task_entries/{id}',
  attributes: {
    cycle_task_group_object_task: 'CMS.Models.CycleTaskGroupObjectTask.stub',
    modified_by: 'CMS.Models.Person.stub',
    context: 'CMS.Models.Context.stub',
    cycle: 'CMS.Models.Cycle.stub',
  },

  tree_view_options: {
    show_view: mustachePath + '/tree.mustache',
    footer_view: mustachePath + '/tree_footer.mustache',
  },
  init: function () {
    this._super(...arguments);
    this.bind('created', (ev, instance) => {
      if (instance instanceof this) {
        return $.when(Permission.refresh(),
          refreshAttr(instance, 'cycle_task_group_object_task'))
          .then(() => {
            tracker.stop('CycleTaskEntry',
              tracker.USER_JOURNEY_KEYS.INFO_PANE,
              tracker.USER_ACTIONS.CYCLE_TASK.ADD_COMMENT);
          });
      }
    });
    this.validateNonBlank('description');
  },
}, {
  save() {
    if (this.isNew()) {
      tracker.start('CycleTaskEntry',
        tracker.USER_JOURNEY_KEYS.INFO_PANE,
        tracker.USER_ACTIONS.CYCLE_TASK.ADD_COMMENT);
    }

    return this._super(...arguments);
  },
});
