/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import * as StateUtils from '../../plugins/utils/state-utils';
import router from '../../router';
import DisplayPrefs from '../../models/local-storage/display-prefs';

let viewModel = can.Map.extend({
  disabled: false,
  options: {
    name: 'status',
    query: null,
  },
  filterStates: [],
  widgetId: null,
  modelName: null,
  displayPrefs: null,
  define: {
    currentStates: {
      get() {
        let states = this.attr('filterStates')
          .filter((state) => state.checked)
          .map((state) => state.value);
        return states;
      },
    },
    allStates: {
      get() {
        let modelName = this.attr('modelName');
        let states = StateUtils.getStatesForModel(modelName);
        return states;
      },
    },
  },
  getDefaultStates() {
    let widgetId = this.attr('widgetId');
    // Get the status list from local storage
    let savedStates = this.attr('displayPrefs').getTreeViewStates(widgetId);
    // Get the status list from query string
    let queryStates = router.attr('state');

    let modelName = this.attr('modelName');
    let allStates = this.attr('allStates');

    let defaultStates = (queryStates || savedStates).filter((state) => {
      return allStates.includes(state);
    });

    if (defaultStates.length === 0) {
      defaultStates = StateUtils.getDefaultStatesForModel(modelName);
    }

    return defaultStates;
  },
  saveTreeStates(selectedStates) {
    let widgetId = this.attr('widgetId');
    this.attr('displayPrefs').setTreeViewStates(widgetId, selectedStates);
  },
  setStatesDropdown(states) {
    let statuses = this.attr('filterStates');
    statuses.forEach((item) => {
      item.attr('checked', (states.indexOf(item.value) > -1));
    });
  },
  setStatesRoute(states) {
    let allStates = this.attr('allStates');

    if (states.length && _.difference(allStates, states).length) {
      router.attr('state', states);
    } else {
      router.removeAttr('state');
    }
  },
  buildSearchQuery(states) {
    let allStates = this.attr('allStates');
    let modelName = this.attr('modelName');
    let query = (states.length && _.difference(allStates, states).length) ?
      StateUtils.buildStatusFilter(states, modelName) :
      null;
    this.attr('options.query', query);
  },
});

export default can.Component.extend({
  tag: 'tree-status-filter',
  viewModel: viewModel,
  events: {
    inserted() {
      let vm = this.viewModel;

      vm.attr('router', router);

      if (vm.registerFilter) {
        let options = vm.attr('options');
        vm.registerFilter(options);
      }

      // Setup key-value pair items for dropdown
      let filterStates = vm.attr('allStates').map((state) => {
        return {
          value: state,
        };
      });
      vm.attr('filterStates', filterStates);

      DisplayPrefs.getSingleton().then((displayPrefs) => {
        vm.attr('displayPrefs', displayPrefs);

        let defaultStates = vm.getDefaultStates();
        vm.buildSearchQuery(defaultStates);
        vm.setStatesDropdown(defaultStates);
        vm.setStatesRoute(defaultStates);
      });
    },
    'multiselect-dropdown multiselect:closed'(el, ev, selected) {
      ev.stopPropagation();
      let selectedStates = selected.map((state) => state.value);

      this.viewModel.buildSearchQuery(selectedStates);
      this.viewModel.saveTreeStates(selectedStates);
      this.viewModel.setStatesRoute(selectedStates);
      this.viewModel.dispatch('filter');
    },
    '{viewModel} disabled'() {
      if (this.viewModel.attr('disabled')) {
        this.viewModel.setStatesDropdown([]);
        this.viewModel.setStatesRoute([]);
      } else {
        let defaultStates = this.viewModel.getDefaultStates();
        this.viewModel.setStatesDropdown(defaultStates);
        this.viewModel.setStatesRoute(defaultStates);
      }
    },
    '{viewModel.router} state'(router, event, newStatuses) {
      let isCurrent = this.viewModel.attr('widgetId') === router.attr('widget');
      let isEnabled = !this.viewModel.attr('disabled');

      let currentStates = this.viewModel.attr('currentStates');
      newStatuses = newStatuses || this.viewModel.attr('allStates');
      let isChanged =
        _.difference(currentStates, newStatuses).length ||
        _.difference(newStatuses, currentStates).length;

      if (isCurrent && isEnabled && isChanged) {
        this.viewModel.buildSearchQuery(newStatuses);
        this.viewModel.setStatesDropdown(newStatuses);
        this.viewModel.dispatch('filter');
      }
    },
    '{viewModel.router} widget'(router) {
      let isCurrent = this.viewModel.attr('widgetId') === router.attr('widget');
      let isEnabled = !this.viewModel.attr('disabled');
      let routeStatuses = router.attr('state');

      if (isCurrent && isEnabled && !routeStatuses) {
        let statuses = this.viewModel.attr('currentStates');
        this.viewModel.setStatesRoute(statuses);
      }
    },
  },
});
