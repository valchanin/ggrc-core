/*!
  Copyright (C) 2017 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

describe('GGRC.Components.objectSearch', function () {
  'use strict';

  var viewModel;

  beforeEach(function () {
    viewModel = new GGRC.Components.getViewModel('objectSearch')();
  });

  describe('availableTypes() method', function () {
    it('correctly calls getMappingTypes', function () {
      var result;
      spyOn(GGRC.Mappings, 'getMappingTypes').and.returnValue('types');
      viewModel.attr('object', 'testObject');

      result = viewModel.availableTypes();
      expect(GGRC.Mappings.getMappingTypes).toHaveBeenCalledWith('testObject',
        ['TaskGroupTask', 'TaskGroup', 'CycleTaskGroupObjectTask'], []);
      expect(result).toEqual('types');
    });
  });

  describe('onSubmit() method', function () {
    it('sets resultsRequested flag to true', function () {
      viewModel.attr('resultsRequested', false);

      viewModel.onSubmit();

      expect(viewModel.attr('resultsRequested')).toBe(true);
    });
  });
});
