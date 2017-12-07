/*!
    Copyright (C) 2017 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import '../form/fields/dropdown-form-field';
import '../object-list-item/person-list-item';
import template from './readonly-inline-content.mustache';

(function (can, GGRC) {
  'use strict';

  GGRC.Components('readonlyInlineContent', {
    tag: 'readonly-inline-content',
    template: template,
    viewModel: {
      withReadMore: false,
      value: '@',
      withDetails: false
    }
  });
})(window.can, window.GGRC);
