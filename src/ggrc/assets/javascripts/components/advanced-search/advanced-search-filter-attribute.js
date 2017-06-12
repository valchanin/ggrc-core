/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, GGRC) {
  'use strict';

  var template = can.view(GGRC.mustache_path +
    '/components/advanced-search/advanced-search-filter-attribute.mustache');

  var viewModel = can.Map.extend({
    define: {
      availableAttributes: {
        type: '*',
        Value: can.List,
        set: function (attributes) {
          var attribute = this.attr('attribute');
          if (attributes.length &&
            attributes[0].attr_title &&
            !attribute.field) {
            attribute.field = attributes[0].attr_title;
          }
          return attributes;
        }
      }
    },
    attribute: {},
    extendable: false,
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
