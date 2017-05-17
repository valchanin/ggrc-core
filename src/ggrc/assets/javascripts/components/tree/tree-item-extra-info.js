/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, GGRC) {
  'use strict';

  var template = can.view(GGRC.mustache_path +
    '/components/tree/tree-item-extra-info.mustache');
  var statusClasses = {
    Verified: 'state-verified',
    Assigned: 'state-assigned',
    Finished: 'state-finished',
    InProgress: 'state-inprogress',
    Overdue: 'state-overdue'
  };

  var viewModel = can.Map.extend({
    define: {
      dueDate: {
        type: 'date',
        get: function () {
          return this.attr('instance.next_due_date') ||
            this.attr('instance.end_date');
        }
      },
      dueDateCssClass: {
        type: 'string',
        get: function () {
          var isOverdue = this.attr('isCycleTasks') &&
            this.attr('instance.isOverdue');
          return isOverdue ? 'state-overdue' : '';
        }
      },
      isSubTreeItem: {
        type: 'htmlbool',
        value: false
      },
      showingOverdueDate: {
        type: 'boolean',
        value: false,
        get: function () {
          return this.attr('isSubTreeItem') &&
              this.attr('isCycleTaskGroupObjectTask');
        }
      },
      isActive: {
        type: 'boolean',
        get: function () {
          return this.attr('drawStatuses') ||
            this.attr('isDirective') ||
            this.attr('isCycleTasks') ||
            this.attr('isSection');
        }
      },
      isDirective: {
        type: 'boolean',
        get: function () {
          return this.attr('instance') instanceof CMS.Models.Directive;
        }
      },
      isSection: {
        type: 'boolean',
        get: function () {
          return this.attr('instance') instanceof CMS.Models.Section;
        }
      },
      isCycleTaskGroupObjectTask: {
        type: 'boolean',
        get: function () {
          return this.attr('instance') instanceof
            CMS.Models.CycleTaskGroupObjectTask;
        }
      },
      isCycleTaskGroup: {
        type: 'boolean',
        get: function () {
          return this.attr('instance') instanceof CMS.Models.CycleTaskGroup;
        }
      },
      isCycleTasks: {
        type: 'boolean',
        get: function () {
          return this.attr('isCycleTaskGroup') ||
            this.attr('isCycleTaskGroupObjectTask') ||
            this.attr('instance') instanceof CMS.Models.Cycle;
        }
      },
      disablePopover: {
        type: 'boolean',
        get: function () {
          return this.attr('instance') instanceof CMS.Models.Cycle;
        }
      },
      drawStatuses: {
        type: 'boolean',
        get: function () {
          return !!this.attr('instance.workflow_state');
        }
      },
      cssClasses: {
        type: 'string',
        get: function () {
          var classes = [];
          var instance = this.attr('instance');
          if (this.attr('drawStatuses')) {
            classes.push(statusClasses[instance.workflow_state]);
          }

          if (this.attr('isCycleTasks') && this.attr('instance.isOverdue')) {
            classes.push(statusClasses.Overdue);
          }

          if (this.attr('spin')) {
            classes.push('fa-spinner');
            classes.push('fa-spin');
          } else {
            classes.push('fa-info-circle');
          }
          return classes.join(' ');
        }
      }
    },
    onEnter: function () {
      this.attr('spin', true);
    },
    onLeave: function () {
      this.attr('spin', false);
    },
    classes: [],
    instance: null
  });

  GGRC.Components('treeItemExtraInfo', {
    tag: 'tree-item-extra-info',
    template: template,
    viewModel: viewModel
  });
})(window.can, window.GGRC);
