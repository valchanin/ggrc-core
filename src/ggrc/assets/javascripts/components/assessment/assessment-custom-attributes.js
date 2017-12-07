/*!
 Copyright (C) 2017 Google Inc., authors, and contributors
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import './info-pane/confirm-edit-action';
import template from './custom-attributes.mustache';

(function (can, GGRC) {
  'use strict';

  GGRC.Components('assessmentCustomAttributes', {
    tag: 'assessment-custom-attributes',
    template: template,
    viewModel: {
      globalAttributes: [],
      items: [],
      editMode: false,
      modifiedFields: {},
      isEditDenied: false,
      updateGlobalAttribute: function (event, field) {
        this.attr('modifiedFields').attr(field.id, event.value);
        this.dispatch({
          type: 'onUpdateAttributes',
          globalAttributes: this.attr('modifiedFields')
        });
        this.attr('modifiedFields', {}, true);
      }
    }
  });
})(window.can, window.GGRC);
