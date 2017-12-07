/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import './advanced-search-mapping-group';
import './advanced-search-mapping-criteria';
import './advanced-search-filter-operator';
import AdvancedSearchContainer from '../view-models/advanced-search-container-vm';
import * as AdvancedSearch from '../../plugins/utils/advanced-search-utils';
import template from './advanced-search-mapping-container.mustache';

(function (can, GGRC) {
  'use strict';

  /**
   * Mapping Container view model.
   * Contains logic used in Mapping Container component
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
     * Adds Mapping Criteria and Operator to the collection.
     * Adds only Mapping Criteria if collection is empty.
     */
    addMappingCriteria: function () {
      var items = this.attr('items');
      if (items.length) {
        items.push(AdvancedSearch.create.operator('AND'));
      }
      items.push(AdvancedSearch.create.mappingCriteria());
    },
    /**
     * Transforms Mapping Criteria to Mapping Group.
     * @param {can.Map} criteria - Mapping Criteria.
     */
    createGroup: function (criteria) {
      var items = this.attr('items');
      var index = items.indexOf(criteria);
      items.attr(index, AdvancedSearch.create.group([
        criteria,
        AdvancedSearch.create.operator('AND'),
        AdvancedSearch.create.mappingCriteria()
      ]));
    },
    /**
     * Indicates whether 'Add' button should be displayed.
     */
    showAddButton: {
      type: 'boolean',
      value: true
    }
  });

  /**
   * Mapping Container is a component allowing to compose Mapping Criteria, Groups and Operators.
   */
  GGRC.Components('advancedSearchMappingContainer', {
    tag: 'advanced-search-mapping-container',
    template: template,
    viewModel: viewModel
  });
})(window.can, window.GGRC);
