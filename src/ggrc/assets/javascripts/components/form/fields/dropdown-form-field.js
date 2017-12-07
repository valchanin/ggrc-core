/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../../dropdown/dropdown';
import template from './dropdown-form-field.mustache';

(function (can, GGRC) {
  'use strict';

  GGRC.Components('dropdownFormField', {
    tag: 'dropdown-form-field',
    template: template,
    viewModel: {
      define: {
        isNoneSelected: {
          get: function () {
            return this.attr('value') === null &&
              this.attr('disabled');
          }
        },
        _value: {
          type: 'string',
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
        },
        fieldId: {
          type: 'number'
        }
      },
      options: [],
      isGroupedDropdown: false,
      dropdownOptionsGroups: {},
      noValue: true,
      valueChanged: function (newValue) {
        this.dispatch({
          type: 'valueChanged',
          fieldId: this.attr('fieldId'),
          value: newValue
        });
      }
    }
  });
})(window.can, window.GGRC);
