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
      }
    };

    function buildExpressionList(filterString) {
      var fo = GGRC.query_parser.parse(filterString);
      var initialFilters;

      if (_.isEmpty(fo.expression)) {
        return [];
      }

      initialFilters = makeConsistent(fo.expression);
      return _.isArray(initialFilters.value) ?
        initialFilters.value : [initialFilters];
    }
    function makeConsistent(item) {
      var leftResult;
      var rightResult;
      var operator;
      var resultArray;

      // if it's an attribute
      if (_.isString(item.left) && _.isString(item.right)) {
        return create.attribute({
          left: item.left,
          right: item.right,
          op: item.op.name
        });
      }
      // else group
      leftResult = makeConsistent(item.left);
      rightResult = makeConsistent(item.right);
      operator = create.operator(item.op.name);

      resultArray = addGroupToResult([], leftResult, operator.value);
      resultArray.push(operator);
      resultArray = addGroupToResult(resultArray, rightResult, operator.value);

      return create.group(resultArray, item.op.name);
    }
    function addGroupToResult(resultArray, group, operator) {
      if (group.groupOperator === operator) {
        resultArray = resultArray.concat(group.value);
      } else {
        resultArray.push(group);
      }
      return resultArray;
    }

    function attributeToFilter(attribute) {
      return [attribute.left, attribute.op, attribute.right].join(' ');
    }
    function operatorToFilter(operator) {
      return ' ' + operator + ' ';
    }
    function getFilterFromArray(items) {
      var result = '';
      _.forEach(items, function (item) {
        if (item.type === 'attribute') {
          result += attributeToFilter(item.value);
        }
        if (item.type === 'group' && item.value && item.value.length) {
          result += '( ' + getFilterFromArray(item.value) + ' )';
        }
        if (item.type === 'operator') {
          result += operatorToFilter(item.value);
        }
      });
      return result;
    }

    return {
      buildExpressionList: buildExpressionList,
      getFilterFromArray: getFilterFromArray,
      create: create
    };
  })();
})(window.GGRC, window.can, window._);
