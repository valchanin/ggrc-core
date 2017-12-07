/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../../object-list-item/person-list-item';
import template from './person-form-field-view.mustache';

(function (can, GGRC) {
  'use strict';

  GGRC.Components('personFormFieldView', {
    tag: 'person-form-field-view',
    template: template,
    viewModel: {
      value: null,
      disabled: false
    }
  });
})(window.can, window.GGRC);
