/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './templates/tree-filter-input.mustache';

let viewModel = can.Map.extend({
  define: {
    filter: {
      type: 'string',
      set: function (newValue) {
        this.onFilterChange(newValue);
        return newValue;
      },
    },
    depth: {
      type: 'boolean',
      value: false,
    },
    isExpression: {
      type: 'boolean',
      value: false,
    },
    filterDeepLimit: {
      type: 'number',
      value: 0,
    },
  },
  disabled: false,
  options: {
    query: null,
  },
  init: function () {
    let options = this.attr('options');
    let depth = this.attr('depth');
    let filterDeepLimit = this.attr('filterDeepLimit');

    options.attr('depth', depth);
    options.attr('filterDeepLimit', filterDeepLimit);
    options.attr('name', 'custom');

    if (this.registerFilter) {
      this.registerFilter(options);
    }
  },
  submit: function () {
    this.dispatch('submit');
  },
  onFilterChange: function (newValue) {
    let filter = GGRC.query_parser.parse(newValue);
    let isExpression =
      !!filter && !!filter.expression.op &&
      filter.expression.op.name !== 'text_search' &&
      filter.expression.op.name !== 'exclude_text_search';
    this.attr('isExpression', isExpression);

    this.attr('options.query', newValue.length ? filter : null);
  },
});

export default can.Component.extend({
  tag: 'tree-filter-input',
  template,
  viewModel,
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
    },
  },
});
