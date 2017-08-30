/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, GGRC) {
  'use strict';

  GGRC.Components('advancedSearchWrapper', {
    tag: 'advanced-search-wrapper',
    viewModel: can.Map.extend({
      define: {
        hasStatusFilter: {
          get: function () {
            return GGRC.Utils.State.hasFilter(this.attr('modelName'));
          }
        }
      },
      modelName: null,
      modelDisplayName: null,
      filterItems: [],
      mappingItems: [],
      statusItem: {},
      relevantTo: [],
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
        this.attr('statusItem', {});
      }
    }),
    events: {
      '{viewModel} modelName': function () {
        this.viewModel.resetFilters();
      }
    }
  });
})(window.can, window.GGRC);
