/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './advanced-search-filter-operator.mustache';

(function (can, GGRC) {
  'use strict';

  /**
   * Filter Operator view model.
   * Contains logic used in Filter Operator component
   * @constructor
   */
  var viewModel = can.Map.extend({
    /**
     * Contains operation name.
     * @type {string}
     * @example
     * AND
     * OR
     */
    operator: ''
  });

  /**
   * Filter Operator is a component representing operation connecting Advanced Search items.
   */
  GGRC.Components('advancedSearchFilterOperator', {
    tag: 'advanced-search-filter-operator',
    template: template,
    viewModel: viewModel
  });
})(window.can, window.GGRC);
