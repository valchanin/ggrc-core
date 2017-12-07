/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../form/fields/checkbox-form-field';
import '../form/fields/date-form-field';
import '../form/fields/dropdown-form-field';
import '../form/fields/person-form-field';
import '../form/fields/rich-text-form-field';
import '../form/fields/text-form-field';
import template from './custom-attributes-field.mustache';

(function (can, GGRC) {
  'use strict';

  GGRC.Components('localCustomAttributesField', {
    tag: 'custom-attributes-field',
    template: template,
    viewModel: {
      define: {
        disabled: {
          type: 'htmlbool'
        }
      },
      type: null,
      value: null,
      fieldId: null,
      placeholder: '',
      options: [],
      fieldValueChanged: function (e, scope) {
        this.dispatch({
          type: 'valueChanged',
          fieldId: e.fieldId,
          value: e.value,
          field: scope
        });
      }
    }
  });
})(window.can, window.GGRC);
