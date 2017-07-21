/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, GGRC) {
  'use strict';

  var builders = {
    attribute: function (attribute) {
      var operators = {
        '~': 'contains',
        '=': 'equals',
        '!~': 'does not contain',
        '!=': 'is not equal',
        '<': 'less than',
        '>': 'greater than'
      };
      return [
        attribute.field,
        operators[attribute.operator],
        '"' + attribute.value.trim() + '"'
      ].join(' ');
    },
    operator: function (operator) {
      return ' ' + operator + ' ';
    },
    state: function stateToFilter(state) {
      var result = '';
      var operators = {
        ANY: '=',
        NONE: '!='
      };
      function itemsToString(states) {
        var statesString = _.map(states, function (item) {
          return '"' + item + '"';
        }).join(', ');
        if (states.length > 1) {
          statesString = '(' + statesString + ')';
        }
        return statesString;
      }
      if (state.items.length) {
        result = [
          'AND state',
          operators[state.operator],
          itemsToString(state.items)
        ].join(' ');
      }
      return result;
    },
    group: function groupToFilter(items, request) {
      return '(' + itemsToString(items, request) + ')';
    },
    mappingCriteria: function mappingCriteriaToFilter(criteria) {
      var title = CMS.Models[criteria.objectName].title_singular;
      var result = [
        'mapped to',
        title,
        'with',
        builders.attribute(criteria.filter.value)
      ].join(' ');
      if (criteria.mappedTo) {
        result += [
          ' where',
          title,
          'is',
          builders[criteria.mappedTo.type](criteria.mappedTo.value)
        ].join(' ');
      }
      return result;
    }
  };

  function itemsToString(items, initialState) {
    var result = '';
    if (items.length) {
      result = initialState || result;
      _.each(items, function (item) {
        result += builders[item.type](item.value);
      });
    }
    return result;
  }

  function relevantToString(items) {
    var result = _.map(items, function (item) {
      return [
        'AND mapped to',
        CMS.Models[item.type].title_singular,
        item.title
      ].join(' ');
    }).join(' ');
    return result;
  }

  GGRC.Components('advancedSearchWrapper', {
    tag: 'advanced-search-wrapper',
    viewModel: can.Map.extend({
      define: {
        filterItems: {
          value: [],
          get: function (items) {
            if (items && !items.length &&
              GGRC.Utils.State.hasFilter(this.attr('modelName'))) {
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
      modelDisplayName: null,
      mappingItems: [],
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
      },
      filterString: function () {
        var filterString = [
          this.attr('modelDisplayName'),
          itemsToString(this.attr('filterItems')),
          relevantToString(this.attr('relevantTo')),
          itemsToString(this.attr('mappingItems'), 'AND ')
        ].join(' ');
        return filterString;
      }
    }),
    events: {
      '{viewModel} modelName': function () {
        this.viewModel.resetFilters();
      }
    }
  });
})(window.can, window.GGRC);
