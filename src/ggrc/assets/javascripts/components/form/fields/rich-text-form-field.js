/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './rich-text-form-field.mustache';

(function (can, GGRC) {
  'use strict';

  GGRC.Components('richTextFormField', {
    tag: 'rich-text-form-field',
    template: template,
    viewModel: {
      _value: '',
      _oldValue: null,
      placeholder: '',
      define: {
        value: {
          set: function (newValue, setValue) {
            setValue(newValue);
            if (!_.isNull(newValue)) {
              this.attr('_value', newValue);
            }
          }
        },
        _value: {
          set: function (newValue, setValue, onError, oldValue) {
            setValue(newValue);
            this.attr('_oldValue', oldValue);
            if (oldValue === undefined ||
                newValue === oldValue ||
                newValue.length && !can.trim(newValue).length) {
              return;
            }

            setTimeout(function () {
              this.checkValueChanged();
            }.bind(this), 5000);
          }
        }
      },
      fieldId: null,
      checkValueChanged: function () {
        var newValue = this.attr('_value');
        var oldValue = this.attr('_oldValue');
        if (newValue !== oldValue) {
          this.valueChanged(newValue);
        }
      },
      valueChanged: function (newValue) {
        this.dispatch({
          type: 'valueChanged',
          fieldId: this.fieldId,
          value: newValue
        });
      },
      onBlur: function () {
        this.checkValueChanged();
      }
    },
    events: {
      '.ql-editor blur': function () {
        this.viewModel.onBlur();
      }
    }
  });
})(window.can, window.GGRC);
