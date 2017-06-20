/*!
  Copyright (C) 2017 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

describe('GGRC.Components.advancedSearchFilterGroup', function () {
  'use strict';

  var viewModel;

  beforeEach(function () {
    viewModel = GGRC.Components.getViewModel('advancedSearchFilterGroup');
  });

  describe('addFilterCriterion() method', function () {
    it('adds only attribute if list is empty', function () {
      var items;

      viewModel.addFilterCriterion();

      items = viewModel.attr('items');
      expect(items.length).toBe(1);
      expect(items[0].type).toBe('attribute');
    });

    it('adds operator and attribute if list is not empty', function () {
      var items;
      viewModel.attr('items', [GGRC.Utils.AdvancedSearch.create.attribute()]);
      viewModel.addFilterCriterion();

      items = viewModel.attr('items');
      expect(items.length).toBe(3);
      expect(items[0].type).toBe('attribute');
      expect(items[1].type).toBe('operator');
      expect(items[2].type).toBe('attribute');
    });
  });

  describe('removeFilterCriterion() method', function () {
    it('removes attribute and operator in front if item is first',
    function () {
      var viewItems;
      viewModel.attr('items', [
        GGRC.Utils.AdvancedSearch.create.attribute({field: 'first'}),
        GGRC.Utils.AdvancedSearch.create.operator(),
        GGRC.Utils.AdvancedSearch.create.attribute({field: 'second'})
      ]);
      viewItems = viewModel.attr('items');

      viewModel.removeFilterCriterion(viewItems[0]);

      expect(viewItems.length).toBe(1);
      expect(viewItems[0].type).toBe('attribute');
      expect(viewItems[0].value.field).toBe('second');
    });

    it('removes attribute and operator behind if item is not first',
    function () {
      var viewItems;
      viewModel.attr('items', [
        GGRC.Utils.AdvancedSearch.create.attribute({field: 'first'}),
        GGRC.Utils.AdvancedSearch.create.operator(),
        GGRC.Utils.AdvancedSearch.create.attribute({field: 'second'})
      ]);
      viewItems = viewModel.attr('items');

      viewModel.removeFilterCriterion(viewItems[2]);

      expect(viewItems.length).toBe(1);
      expect(viewItems[0].type).toBe('attribute');
      expect(viewItems[0].value.field).toBe('first');
    });

    it('removes group if single attribute was removed', function () {
      var viewItems;
      viewModel.attr('items', [
        GGRC.Utils.AdvancedSearch.create.attribute({field: 'single'})
      ]);
      viewItems = viewModel.attr('items');
      spyOn(viewModel, 'remove');

      viewModel.removeFilterCriterion(viewItems[0]);

      expect(viewModel.remove).toHaveBeenCalled();
    });
  });
});
