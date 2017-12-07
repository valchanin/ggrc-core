/*
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './bulk-update-target-state.mustache';

var objectStateToWarningMap = {
  CycleTaskGroupObjectTask: {
    InProgress: 'Please be aware that Finished, Declined and Verified ' +
      'tasks cannot be moved to In Progress state.',
    Finished: 'Please be aware that Assigned and Verified ' +
      'tasks cannot be moved to Finished state.',
    Declined: 'Please be aware that Assigned, In Progress and Verified ' +
      'tasks cannot be moved to Declined state.',
    Verified: 'Please be aware that Assigned, In Progress and Declined ' +
      'tasks cannot be moved to Verified state.',
  },
};

export default can.Component.extend({
  tag: 'bulk-update-target-state',
  template: template,
  viewModel: {
    define: {
      warningMessage: {
        get: function () {
          var model = this.attr('modelName');
          var targetState = this.attr('targetState');
          return objectStateToWarningMap[model]
            && objectStateToWarningMap[model][targetState]
            || '';
        },
      },
    },
    modelName: null,
    targetState: null,
    targetStates: [],
    enabled: false,
  },
 });
