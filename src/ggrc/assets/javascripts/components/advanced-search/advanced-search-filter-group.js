/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, GGRC) {
  'use strict';

  var template = can.view(GGRC.mustache_path +
    '/components/advanced-search/advanced-search-filter-group.mustache');

  var viewModel = can.Map.extend({
    items: can.List(),
    availableAttributes: can.List(),
    addFilterCriterion: function () {
      var items = this.attr('items');
      if (items.length) {
        items.push(GGRC.Utils.AdvancedSearch.create.operator('AND'));
      }
      items.push(GGRC.Utils.AdvancedSearch.create.attribute());
    },
    removeFilterCriterion: function (item) {
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
