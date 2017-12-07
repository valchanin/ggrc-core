/*!
    Copyright (C) 2017 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import template from './base-inline-control-title.mustache';

(function (can) {
  'use strict';

  GGRC.Components('baseInlineControlTitle', {
    tag: 'base-inline-control-title',
    template: template,
    viewModel: {
      define: {
        isEditIconAllowed: {
          get: function () {
            return !this.attr('editMode') &&
              !this.attr('isLoading') &&
              !this.attr('isEditIconDenied');
          }
        }
      },
      isLoading: false,
      editMode: false,
      isEditIconDenied: false
    },
    events: {
      '.inline-edit-icon click': function () {
        this.viewModel.dispatch('setEditModeInline');
      }
    }
  });
})(window.can);
