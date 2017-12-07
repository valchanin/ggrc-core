/*!
    Copyright (C) 2017 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import './confirm-edit-action';
import template from './inline-item.mustache';

(function (can) {
  'use strict';

  GGRC.Components('assessmentInlineItem', {
    tag: 'assessment-inline-item',
    template: template,
    viewModel: {
      instance: {},
      propName: '@',
      value: '',
      type: '@',
      dropdownOptions: [],
      dropdownOptionsGroups: {},
      dropdownClass: '@',
      isGroupedDropdown: false,
      dropdownNoValue: false,
      withReadMore: false,
      isEditIconDenied: false,
      onStateChangeDfd: can.Deferred().resolve(),
      mandatory: false,
    }
  });
})(window.can);
