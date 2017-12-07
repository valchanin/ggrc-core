/*!
    Copyright (C) 2017 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import template from './mapping-type-selector.mustache';

(function (can, GGRC) {
  'use strict';

  GGRC.Components('mappingTypeSelector', {
    tag: 'mapping-type-selector',
    template: template,
    viewModel: {
      disabled: false,
      readonly: false,
      types: [],
      selectedType: ''
    },
    init: function () {
      var selectedType = this.viewModel.selectedType;
      var types = this.viewModel.types;
      var groups = ['business', 'entities', 'governance'];
      var values = [];

      groups.forEach(function (name) {
        var groupItems = types.attr(name + '.items');
        values = values.concat(_.pluck(groupItems, 'value'));
      });
      if (values.indexOf(selectedType) < 0) {
        this.viewModel.attr('selectedType', values[0]);
      }
    }
  });
})(window.can, window.GGRC);
