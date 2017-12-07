/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../../datepicker/datepicker';
import template from './date-form-field.mustache';

(function (can, GGRC) {
  'use strict';

  GGRC.Components('dateFormField', {
    tag: 'date-form-field',
    template: template,
    viewModel: {
      define: {
        _value: {
          set: function (newValue, setValue, onError, oldValue) {
            setValue(newValue);
            if (oldValue === undefined ||
                newValue === oldValue) {
              return;
            }
            this.valueChanged(newValue);
          }
        },
        value: {
          set: function (newValue, setValue) {
            setValue(newValue);
            this.attr('_value', newValue);
          }
        }
      },
      fieldId: null,
      readonly: true,
      valueChanged: function (newValue) {
        this.dispatch({
          type: 'valueChanged',
          fieldId: this.fieldId,
          value: newValue
        });
      }
    }
  });
})(window.can, window.GGRC);
