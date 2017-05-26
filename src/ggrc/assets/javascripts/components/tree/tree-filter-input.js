/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, GGRC) {
  'use strict';

  var template = can.view(GGRC.mustache_path +
    '/components/tree/tree-filter-input.mustache');
  var viewModel = can.Map.extend({
    advancedSearch: {
      open: false,
      items: []
    },
    define: {
      filter: {
        type: 'string',
        set: function (newValue) {
          this.attr('options.filter', newValue || '');
          this.onFilterChange(newValue);
          return newValue;
        }
      },
      operation: {
        type: 'string',
        value: 'AND'
      },
      depth: {
        type: 'boolean',
        value: false
      },
      isExpression: {
        type: 'boolean',
        value: false
      }
    },
    options: {},
    filters: null,
    init: function () {
      var options = this.attr('options');
      var filter = this.attr('filter');
      var operation = this.attr('operation');
      var depth = this.attr('depth');

      options.attr('filter', filter);
      options.attr('operation', operation);
      options.attr('depth', depth);
      options.attr('name', 'custom');

      if (this.registerFilter) {
        this.registerFilter(options);
      }
    },
    submit: function () {
      this.dispatch('filter');
    },
    reset: function () {
      this.attr('filter', '');
      this.submit();
    },
    onFilterChange: function (newValue) {
      var filter = GGRC.query_parser.parse(newValue);
      var isExpression =
        !!filter && !!filter.expression.op &&
        filter.expression.op.name !== 'text_search' &&
        filter.expression.op.name !== 'exclude_text_search';
      this.attr('isExpression', isExpression);
    },
    openAdvancedFilter: function () {
      var initialFilters = GGRC.Utils.AdvancedSearch
        .buildExpressionList(this.attr('filter'));

      this.attr('advancedSearch.items', initialFilters);
      this.attr('advancedSearch.open', true);
    },
    applyFilters: function () {
      var filterString = GGRC.Utils.AdvancedSearch
        .getFilterFromArray(this.advancedSearch.items);

      this.attr('filter', filterString);
      this.attr('advancedSearch.open', false);
    }
  });

  GGRC.Components('treeFilterInput', {
    tag: 'tree-filter-input',
    template: template,
    viewModel: viewModel,
    events: {
      'input keyup': function (el, ev) {
        this.viewModel.onFilterChange(el.val());

        if (ev.keyCode === 13) {
          this.viewModel.submit();
        }
        ev.stopPropagation();
      }
    }
  });
})(window.can, window.GGRC);
