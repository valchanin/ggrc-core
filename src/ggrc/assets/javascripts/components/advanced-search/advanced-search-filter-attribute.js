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
    attribute: {
      left: 'string',
      op: 'string',
      right: 'string'
    },
    remove: function () {
      this.dispatch('remove');
    }
  });

  GGRC.Components('advancedSearchFilterAttribute', {
    tag: 'advanced-search-filter-attribute',
    template: template,
    viewModel: viewModel
  });
})(window.can, window.GGRC);
