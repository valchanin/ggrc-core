/*!
  Copyright (C) 2017 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

describe('GGRC.Components.advancedSearchFilterAttribute', function () {
  'use strict';

  var viewModel;

  beforeEach(function () {
    viewModel = GGRC.Components.getViewModel('advancedSearchFilterAttribute');
  });

  describe('availableAttributes set() method', function () {
    it('initializes "attribute.field" property with first available attribute',
    function () {
      viewModel.attr('availableAttributes', [{
        attr_title: 'FirstAttr'
      }]);

      expect(viewModel.attr('attribute').field).toBe('FirstAttr');
    });

    it('does not intialize "attribute.field" when it is already initialized',
    function () {
      viewModel.attr('attribute.field', 'Field');
      viewModel.attr('availableAttributes', [{
        attr_title: 'FirstAttr'
      }]);

      expect(viewModel.attr('attribute').field).toBe('Field');
    });
  });

  describe('remove() method', function () {
    it('dispatches "remove" event', function () {
      spyOn(viewModel, 'dispatch');

      viewModel.remove();

      expect(viewModel.dispatch).toHaveBeenCalledWith('remove');
    });
  });

  describe('createGroup() method', function () {
    it('dispatches "createGroup" event', function () {
      spyOn(viewModel, 'dispatch');

      viewModel.createGroup();

      expect(viewModel.dispatch).toHaveBeenCalledWith('createGroup');
    });
  });
});
