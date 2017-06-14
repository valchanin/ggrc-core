/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, GGRC) {
  'use strict';

  var template = can.view(GGRC.mustache_path +
    '/components/tree/tree-filter-input.mustache');
  var viewModel = can.Map.extend({
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
    disabled: false,
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
    onFilterChange: function (newValue) {
      var filter = GGRC.query_parser.parse(newValue);
      var isExpression =
        !!filter && !!filter.expression.op &&
        filter.expression.op.name !== 'text_search' &&
        filter.expression.op.name !== 'exclude_text_search';
      this.attr('isExpression', isExpression);
    },
    openAdvancedFilter: function () {
      this.dispatch('openAdvanced');
    },
    resetAdvancedFilters: function () {
      this.dispatch('resetAdvanced');
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
      },
      '{viewModel} disabled': function () {
        this.viewModel.attr('filter', '');
      }
    }
  });
})(window.can, window.GGRC);
