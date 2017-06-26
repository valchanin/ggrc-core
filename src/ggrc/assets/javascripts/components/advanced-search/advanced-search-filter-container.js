/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, GGRC) {
  'use strict';

  var StateUtils = GGRC.Utils.State;

  var template = can.view(GGRC.mustache_path +
    '/components/advanced-search/advanced-search-filter-container.mustache');

  /**
   * Filter Container view model.
   * Contains logic used in Filter Container component
   * @constructor
   */
  var viewModel = can.Map.extend({
    define: {
      /**
       * Contains Filter Attributes, Groups and Operators.
       * Initializes Items with State Attribute by default.
       * @type {can.List}
       */
      items: {
        type: '*',
        Value: can.List,
        set: function (items) {
          if (!items.length) {
            items.push(GGRC.Utils.AdvancedSearch.create.state({
              items: StateUtils.getDefaultStatesForModel(this.attr('modelName'))
            }));
          }
          return items;
        }
      }
    },
    /**
     * Contains specific model name.
     * @type {string}
     * @example
     * Section
     * Regulation
     */
    modelName: null,
    /**
     * Contains available attributes for specific model.
     * @type {can.List}
     */
    availableAttributes: can.List(),
    /**
     * Adds Filter Operator and Filter Attribute to the collection.
     */
    addFilterCriterion: function () {
      var items = this.attr('items');
      items.push(GGRC.Utils.AdvancedSearch.create.operator('AND'));
      items.push(GGRC.Utils.AdvancedSearch.create.attribute());
    },
    /**
     * Removes Filter Operator and Advanced Search filter item from the collection.
     * @param {can.Map} item - Advanced Search filter item.
     */
    removeFilterCriterion: function (item) {
      var items = this.attr('items');
      var index = items.indexOf(item);
      // we have to remove operator in front of each item except the first
      if (index > 0) {
        index--;
      }
      items.splice(index, 2);
    },
    /**
     * Transforms Filter Attribute to Filter Group.
     * @param {can.Map} attribute - Filter Attribute.
     */
    createGroup: function (attribute) {
      var items = this.attr('items');
      var index = items.indexOf(attribute);
      items.attr(index, GGRC.Utils.AdvancedSearch.create.group([
        attribute,
        GGRC.Utils.AdvancedSearch.create.operator('AND'),
        GGRC.Utils.AdvancedSearch.create.attribute()
      ]));
    }
  });

  /**
   * Filter Container is a component allowing to compose Filter Attributes, Groups and Operators.
   */
  GGRC.Components('advancedSearchFilterContainer', {
    tag: 'advanced-search-filter-container',
    template: template,
    viewModel: viewModel
  });
})(window.can, window.GGRC);