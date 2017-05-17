/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, GGRC) {
  'use strict';

  var template = can.view(GGRC.mustache_path +
    '/components/tree/tree-item-status-for-workflow.mustache');
  /**
   *
   */
  GGRC.Components('treeItemStatusForWorkflow', {
    tag: 'tree-item-status-for-workflow',
    template: template,
    viewModel: {
      define: {
        statusTitle: {
          type: 'string',
          get: function () {
            return this.attr('instance.status') === 'InProgress' ?
              'In Progress' :
              this.attr('instance.status');
          }
        },
        statusCSSClass: {
          type: 'string',
          get: function () {
            return this.attr('instance.status') ?
            'state-' + this.attr('instance.status').toLowerCase() : '';
          }
        }
      },
      instance: {}
    }
  });
})(window.can, window.GGRC);
