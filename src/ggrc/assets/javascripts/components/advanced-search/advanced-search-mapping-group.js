/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import AdvancedSearchContainer from '../view-models/advanced-search-container-vm';
import * as AdvancedSearch from '../../plugins/utils/advanced-search-utils';
import template from './advanced-search-mapping-group.mustache';

(function (can, GGRC) {
  'use strict';

  /**
   * Mapping Group view model.
   * Contains logic used in Mapping Group component.
   * @constructor
   */
  var viewModel = AdvancedSearchContainer.extend({
    /**
     * Contains specific model name.
     * @type {string}
     * @example
     * Section
     * Regulation
     */
    modelName: null,
    /**
     * Indicates that Group is created on the root level.
     * @type {boolean}
     */
    root: false,
    /**
     * Adds Filter Operator and Mapping Criteria to the collection.
     */
    addMappingCriteria: function () {
      var items = this.attr('items');
      items.push(AdvancedSearch.create.operator('AND'));
      items.push(AdvancedSearch.create.mappingCriteria());
    }
  });

  /**
   * Mapping Group is a component allowing to compose Mapping Criteria and Operators.
   */
  GGRC.Components('advancedSearchMappingGroup', {
    tag: 'advanced-search-mapping-group',
    template: template,
    viewModel: viewModel
  });
})(window.can, window.GGRC);
