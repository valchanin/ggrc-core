/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, GGRC) {
  'use strict';

  var template = can.view(GGRC.mustache_path +
    '/components/advanced-search/advanced-search-filter-container.mustache');

  var viewModel = can.Map.extend({
    modelName: null,
    items: can.List(),
    availableAttributes: can.List(),
    init: function () {
      if (!this.attr('items.length')) {
        this.attr('items').push(GGRC.Utils.AdvancedSearch.create.state());
      }
    },
    addAttribute: function () {
      var items = this.attr('items');
      items.push(GGRC.Utils.AdvancedSearch.create.operator('AND'));
      items.push(GGRC.Utils.AdvancedSearch.create.attribute());
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
    },
    createGroup: function (attribute) {
      var items = this.attr('items');
      var index = items.indexOf(attribute);
      items.attr(index, GGRC.Utils.AdvancedSearch.create.group([attribute]));
    }
  });

  GGRC.Components('advancedSearchFilterContainer', {
    tag: 'advanced-search-filter-container',
    template: template,
    viewModel: viewModel
  });
})(window.can, window.GGRC);
