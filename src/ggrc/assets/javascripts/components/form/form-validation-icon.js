/*!
 Copyright (C) 2017 Google Inc., authors, and contributors
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, GGRC) {
  'use strict';
  var tag = 'form-validation-icon';
  /**
   * State object to present possible icons for validation
   */
  var icons = {
    noValidation: 'fa-check-circle',
    empty: '',
    valid: 'fa-check form-validation-icon__color-valid',
    invalid: 'fa-times form-validation-icon__color-invalid'
  };

  /**
   * Form validation icon component
   */
  GGRC.Components('formValidationIcon', {
    tag: tag,
    template: '<i class="fa form-validation-icon__body {{iconCls}}"></i>',
    viewModel: {
      define: {
        validation: {},
        iconCls: {
          get: function () {
            var icon = icons.empty;

            if (this.attr('validation.mandatory')) {
              icon = this.attr('validation.valid') ?
                icons.valid : icons.invalid;
            } else if (this.attr('validation.requiresAttachment')) {
              /* This validation is required for DropDowns with required attachments */

              icon = (
                this.attr('validation.valid') &&
                !this.attr('validation.hasMissingInfo')
              ) ? icons.valid : icons.invalid;
            }
            return icon;
          }
        }
      }
    }
  });
})(window.can, window.GGRC);
