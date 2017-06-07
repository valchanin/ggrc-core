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

  describe('init() method', function () {
    it('initializes "attribute.field" property with first available attribute',
    function () {
      viewModel.attr('availableAttributes', [{
        attr_title: 'Title'
      }]);

      viewModel.init();

      expect(viewModel.attr('attribute.field')).toBe('title');
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
