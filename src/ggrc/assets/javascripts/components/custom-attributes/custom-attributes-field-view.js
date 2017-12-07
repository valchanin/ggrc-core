/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../form/field-views/checkbox-form-field-view';
import '../form/field-views/date-form-field-view';
import '../form/field-views/person-form-field-view';
import '../form/field-views/rich-text-form-field-view';
import '../form/field-views/text-form-field-view';
import template from './custom-attributes-field-view.mustache';

(function (can, GGRC) {
  'use strict';

  GGRC.Components('localCustomAttributesFieldView', {
    tag: 'custom-attributes-field-view',
    template: template,
    viewModel: {
      type: null,
      value: null
    }
  });
})(window.can, window.GGRC);
