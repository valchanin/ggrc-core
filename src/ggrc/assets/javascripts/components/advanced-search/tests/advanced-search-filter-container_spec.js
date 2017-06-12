/*!
  Copyright (C) 2017 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

describe('GGRC.Components.advancedSearchFilterContainer', function () {
  'use strict';

  var viewModel;

  beforeEach(function () {
    spyOn(GGRC.Utils.State, 'getDefaultStatesForModel')
      .and.returnValue(['state']);
    viewModel = GGRC.Components.getViewModel('advancedSearchFilterContainer');
  });

  describe('items set() method', function () {
    it('initializes "items" property with state filter if it is empty',
    function () {
      var items;
      viewModel.attr('items', []);

      items = viewModel.attr('items');

      expect(items.length).toBe(1);
      expect(items[0].type).toBe('state');
    });
  });

  describe('addFilterCriterion() method', function () {
    it('adds operator and attribute', function () {
      var items;

      viewModel.addFilterCriterion();

      items = viewModel.attr('items');
      expect(items.length).toBe(3);
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
  });

  describe('createGroup() method', function () {
    it('transforms attribute to group with attribute inside', function () {
      var viewItems;
      viewModel.attr('items', new can.List([
        GGRC.Utils.AdvancedSearch.create.attribute({field: 'first'}),
        GGRC.Utils.AdvancedSearch.create.operator(),
        GGRC.Utils.AdvancedSearch.create.attribute({field: 'second'})
      ]));
      viewItems = viewModel.attr('items');

      viewModel.createGroup(viewItems[0]);

      expect(viewItems.length).toBe(3);
      expect(viewItems[0].type).toBe('group');
      expect(viewItems[1].type).toBe('operator');
      expect(viewItems[2].type).toBe('attribute');
      expect(viewItems[0].value.length).toBe(1);
      expect(viewItems[0].value[0].value.field).toBe('first');
    });
  });
});
