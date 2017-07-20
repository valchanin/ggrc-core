/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, GGRC) {
  'use strict';

  var viewModel = can.Map.extend({
    define: {
      filterItems: {
        value: [],
        get: function (items) {
          if (items && !items.length) {
            items.push(GGRC.Utils.AdvancedSearch.create.state({
              items: GGRC.Utils.State
                .getDefaultStatesForModel(this.attr('modelName')),
              operator: 'ANY',
              modelName: this.attr('modelName')
            }));
          }
          return items;
        }
      }
    },
    modelName: null,
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
    },
    filterString: function () {
      return GGRC.Utils.AdvancedSearch.buildFilter(this.attr('filterItems'));
    }
  });

  GGRC.Components('advancedSearchWrapper', {
    tag: 'advanced-search-wrapper',
    viewModel: viewModel,
    events: {
      '{viewModel} modelName': function () {
        this.viewModel.resetFilters();
      }
    }
  });
})(window.can, window.GGRC);
