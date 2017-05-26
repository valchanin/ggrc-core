/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, GGRC) {
  'use strict';

  var template = can.view(GGRC.mustache_path +
    '/components/advanced-search/advanced-search-filter-group.mustache');

  var viewModel = can.Map.extend({
    items: [],
    initial: false,
    addItem: function (type) {
      var items = this.attr('items');
      if (items.length) {
        items.push(GGRC.Utils.AdvancedSearch.create.operator());
      }
      items.push(GGRC.Utils.AdvancedSearch.create[type]());
    },
    removeItem: function (item) {
      var items = this.attr('items');
      var index = items.indexOf(item);
      if (items.length === index + 1) {
        index--;
      }
      items.splice(index, 2);
    },
    remove: function () {
      this.dispatch('remove');
    }
  });

  GGRC.Components('advancedSearchFilterGroup', {
    tag: 'advanced-search-filter-group',
    template: template,
    viewModel: viewModel
  });
})(window.can, window.GGRC);
