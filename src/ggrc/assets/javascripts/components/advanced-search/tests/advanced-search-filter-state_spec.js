/*!
  Copyright (C) 2017 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

describe('GGRC.Components.advancedSearchFilterState', function () {
  'use strict';

  var viewModel;

  beforeEach(function () {
    viewModel = GGRC.Components.getViewModel('advancedSearchFilterState');
  });

  describe('init() method', function () {
    it('initializes all "filterStates" unchecked if "stateModel" is empty',
    function () {
      viewModel.attr('modelName', 'Section');

      viewModel.init();

      viewModel.attr('filterStates').each(function (item) {
        expect(item.checked).toBeFalsy();
      });
    });

    it('initializes "filterStates" checked with items from "stateModel"',
    function () {
      var selectedItems;
      viewModel.attr('modelName', 'Section');
      viewModel.attr('stateModel', {
        items: ['Active']
      });

      viewModel.init();

      selectedItems = _.filter(viewModel.attr('filterStates'), function (it) {
        return it.checked;
      });
      expect(selectedItems.length).toBe(1);
      expect(selectedItems[0].value).toBe('Active');
    });
  });

  describe('saveTreeStates() method', function () {
    it('updates items collection', function () {
      var items;
      var selectedStates = [{value: 'Active'}, {value: 'Draft'}];
      viewModel.attr('stateModel.items', []);

      viewModel.saveTreeStates(selectedStates);

      items = viewModel.attr('stateModel.items');
      expect(items.length).toBe(2);
      expect(items[0]).toBe('Active');
      expect(items[1]).toBe('Draft');
    });
  });
});
