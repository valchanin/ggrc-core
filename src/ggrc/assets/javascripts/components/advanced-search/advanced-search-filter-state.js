/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, GGRC) {
  'use strict';

  var StateUtils = GGRC.Utils.State;

  var template = can.view(GGRC.mustache_path +
    '/components/advanced-search/advanced-search-filter-state.mustache');

  var viewModel = can.Map.extend({
    define: {
      stateModel: {
        type: '*',
        set: function (state) {
          var filterStates =
            StateUtils.getStatesForModel(this.attr('modelName'));
          var selectedStates = state.items;
          this.attr('filterStates', filterStates.map(function (state) {
            return {
              value: state,
              checked: (selectedStates && (selectedStates.indexOf(state) > -1))
            };
          }));

          state.operator = state.operator || 'ANY';
          state.modelName = this.attr('modelName');

          return state;
        }
      }
    },
    modelName: null,
    filterStates: [],
    stateModel: { },
    saveTreeStates: function (selectedStates) {
      var states;

      // in this case we save previous states
      if (!selectedStates) {
        return;
      }

      states = _.pluck(selectedStates, 'value');

      this.attr('stateModel.items', states);
    }
  });

  GGRC.Components('advancedSearchFilterState', {
    tag: 'advanced-search-filter-state',
    template: template,
    viewModel: viewModel,
    events: {
      'multiselect-dropdown multiselect:changed': function (el, ev, selected) {
        ev.stopPropagation();
        this.viewModel.saveTreeStates(selected);
      }
    }
  });
})(window.can, window.GGRC);
