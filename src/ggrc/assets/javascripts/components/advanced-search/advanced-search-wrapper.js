/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, GGRC) {
  'use strict';

  var viewModel = can.Map.extend({
    modelName: null,
    filterItems: [],
    mappingItems: [],
    availableAttributes: function () {
      var available = GGRC.Utils.TreeView.getColumnsForModel(
        this.attr('modelName'),
        null,
        true
      ).available;
      return available;
    },
    resetFilters: function () {
      this.attr('filterItems', []);
      this.attr('mappingItems', []);
    }
  });

  GGRC.Components('advancedSearchWrapper', {
    tag: 'advanced-search-wrapper',
    viewModel: viewModel
  });
})(window.can, window.GGRC);
