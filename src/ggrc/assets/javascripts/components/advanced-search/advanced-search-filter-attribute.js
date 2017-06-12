/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, GGRC) {
  'use strict';

  var template = can.view(GGRC.mustache_path +
    '/components/advanced-search/advanced-search-filter-attribute.mustache');

  var viewModel = can.Map.extend({
    availableAttributes: [],
    extendable: false,
    attribute: {
      field: '',
      operator: '',
      value: ''
    },
    init: function () {
      var availableAttributes = this.attr('availableAttributes');
      if (availableAttributes.length && availableAttributes[0].attr_title) {
        this.attr('attribute.field',
          availableAttributes[0].attr_title.toLowerCase());
      }
    },
    remove: function () {
      this.dispatch('remove');
    },
    createGroup: function () {
      this.dispatch('createGroup');
    }
  });

  GGRC.Components('advancedSearchFilterAttribute', {
    tag: 'advanced-search-filter-attribute',
    template: template,
    viewModel: viewModel
  });
})(window.can, window.GGRC);
