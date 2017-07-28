/*!
  Copyright (C) 2017 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

describe('GGRC.Components.objectSearch', function () {
  'use strict';

  var Component;
  var viewModel;

  beforeAll(function () {
    Component = GGRC.Components.get('objectSearch');
  });
  beforeEach(function () {
    viewModel = new GGRC.Components.getViewModel('objectSearch')();
  });

  describe('viewModel() method', function () {
    it('returns object with function "isLoadingOrSaving"', function () {
      var result = Component.prototype.viewModel()();
      expect(result.isLoadingOrSaving).toEqual(jasmine.any(Function));
    });

    describe('isLoadingOrSaving() method', function () {
      it('returns true if it is loading', function () {
        viewModel.attr('is_loading', true);
        expect(viewModel.isLoadingOrSaving()).toEqual(true);
      });
      it('returns false if page is not loading, it is not saving,' +
      ' type change is not blocked and mapper is not loading', function () {
        viewModel.attr('is_loading', false);
        expect(viewModel.isLoadingOrSaving()).toEqual(false);
      });
    });
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
});
