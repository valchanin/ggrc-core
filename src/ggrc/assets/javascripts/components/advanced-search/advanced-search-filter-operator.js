/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, GGRC) {
  'use strict';

  var template = can.view(GGRC.mustache_path +
    '/components/advanced-search/advanced-search-filter-operator.mustache');

  var viewModel = can.Map.extend({
    operator: ''
  });

  GGRC.Components('advancedSearchFilterOperator', {
    tag: 'advanced-search-filter-operator',
    template: template,
    viewModel: viewModel
  });
})(window.can, window.GGRC);
