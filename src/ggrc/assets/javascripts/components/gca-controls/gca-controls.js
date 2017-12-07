/*
 Copyright (C) 2017 Google Inc., authors, and contributors
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import {
  ensureGlobalCA,
  getCustomAttributes,
  CUSTOM_ATTRIBUTE_TYPE,
  convertToFormViewField,
  applyChangesToCustomAttributeValue,
} from '../../plugins/utils/ca-utils';
import template from './gca-controls.mustache';

(function (can, GGRC) {
  'use strict';

  /**
   * This component renders edit controls for Global Custom Attributes
   */

  GGRC.Components('gcaControls', {
    tag: 'gca-controls',
    template: template,
    viewModel: {
      instance: {},
      items: [],
      modifiedFields: {},
      validateControls: function () {
          // counting failed mandatory fields
        var valid = this.attr('items')
            .filter(function (itm) {
              var val = itm.value ? String(itm.value) : '';

              var hasError = !val.trim();
              var errorMessages = {
                _any: can.Map.validationMessages.non_blank,
                checkbox: can.Map.validationMessages.must_be_checked,
              };
              var errorMessage = errorMessages[itm.type] || errorMessages._any;

              if (itm.required) {
                itm.attr('caError', hasError ? errorMessage : '');
              }
              return itm.required && hasError;
            }).length === 0;

        this.instance.attr('_gca_valid', valid);
      },
      initGlobalAttributes: function () {
        var cavs;
        ensureGlobalCA(this.attr('instance'));
        cavs = getCustomAttributes(this.attr('instance'),
          CUSTOM_ATTRIBUTE_TYPE.GLOBAL);

        this.attr('items',
          cavs.map(convertToFormViewField)
        );
      },
      updateGlobalAttribute: function (event, field) {
        this.attr('modifiedFields').attr(field.id, event.value);
        field.attr('value', event.value);

        applyChangesToCustomAttributeValue(
          this.attr('instance.custom_attribute_values'),
          this.attr('modifiedFields')
        );

        this.attr('modifiedFields', {}, true);
      },
    },
    events: {
      '{viewModel.items} change': function () {
        this.viewModel.validateControls();
      },
    },
    init: function () {
      this.viewModel.initGlobalAttributes();
      this.viewModel.validateControls();
    },
  });
})(window.can, window.GGRC);
