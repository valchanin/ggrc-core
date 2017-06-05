/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (GGRC, can, _) {
  'use strict';

  GGRC.Utils.AdvancedSearch = (function () {
    var create = {
      attribute: function (value) {
        return {
          type: 'attribute',
          value: value || { }
        };
      },
      group: function (value, groupOperator) {
        return {
          type: 'group',
          value: value || [],
          groupOperator: groupOperator
        };
      },
      operator: function (value) {
        return {
          type: 'operator',
          value: value || ''
        };
      },
      state: function (value) {
        return {
          type: 'state',
          value: value || { }
        };
      }
    };

    var richOperators = {
      ANY: function (values) {
        return _.map(values, function (value) {
          return '"Status"="' + value + '"';
        }).join(' OR ');
      },
      NONE: function (values) {
        return _.map(values, function (value) {
          return '"Status"!="' + value + '"';
        }).join(' AND ');
      }
    };
    var builders = {
      attribute: attributeToFilter,
      operator: operatorToFilter,
      state: stateToFilter,
      group: buildFilterString
    };

    function attributeToFilter(attribute) {
      return '"' + attribute.field +
             '" ' + attribute.operator +
             ' "' + attribute.value + '"';
    }
    function operatorToFilter(operator) {
      return ' ' + operator + ' ';
    }
    function stateToFilter(state) {
      return '(' + GGRC.Utils.State.buildStatusFilter(
        state.items,
        richOperators[state.operator],
        state.modelName) + ')';
    }
    function buildFilterString(items) {
      var result = '';
      _.each(items, function (item) {
        result += builders[item.type](item.value);
      });
      return result;
    }

    return {
      buildFilterString: buildFilterString,
      create: create
    };
  })();
})(window.GGRC, window.can, window._);
