/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../dropdown/multiselect-dropdown';
import * as StateUtils from '../../plugins/utils/state-utils';
import template from './advanced-search-filter-state.mustache';

(function (can, GGRC) {
  'use strict';

  /**
   * Filter State view model.
   * Contains logic used in Filter State component
   * @constructor
   */
  var viewModel = can.Map.extend({
    define: {
      /**
       * Contains criterion's fields: operator, modelName, items.
       * Initializes fitlterStates.
       * @type {can.Map}
       */
      stateModel: {
        type: '*',
        set: function (state) {
          var filterStates =
            StateUtils.getStatesForModel(this.attr('modelName'));

          state.items = state.items ||
            StateUtils.getDefaultStatesForModel(this.attr('modelName'));

          this.attr('filterStates', filterStates.map(function (filterState) {
            return {
              value: filterState,
              checked: (state.items.indexOf(filterState) > -1)
            };
          }));

          state.operator = state.operator || 'ANY';
          state.modelName = this.attr('modelName');

          return state;
        }
      },
      /**
       * Indicates whether status tooltip should be displayed
       * @type {boolean}
       */
      statusTooltipVisible: {
        type: 'boolean',
        value: false,
        get: function () {
          return StateUtils.hasFilterTooltip(this.attr('modelName'));
        }
      },
      /**
       * Indicates whether operator should be displayed.
       * @type {boolean}
       */
      showOperator: {
        type: 'boolean',
        value: true
      }
    },
    /**
     * Contains specific model name.
     * @type {string}
     * @example
     * Section
     * Regulation
     */
    modelName: null,
    /**
     * Contains available states for specific model.
     * @type {string}
     * @example
     * Active
     * Draft
     */
    filterStates: [],
    /**
     * Saves selected states.
     * @param {Array} selectedStates - selected states.
     */
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

  /**
   * Filter State is a specific kind of Advanced Search Filter items.
   */
  GGRC.Components('advancedSearchFilterState', {
    tag: 'advanced-search-filter-state',
    template: template,
    viewModel: viewModel,
    events: {
      /**
       * Saves selected states.
       * @param {object} el - clicked element.
       * @param {object} ev - event object.
       * @param {Array} selected - selected items.
       */
      'multiselect-dropdown multiselect:changed': function (el, ev, selected) {
        ev.stopPropagation();
        this.viewModel.saveTreeStates(selected);
      }
    }
  });
})(window.can, window.GGRC);
