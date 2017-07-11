/*!
  Copyright (C) 2017 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

describe('GGRC.Components.objectSearch', function () {
  'use strict';

  var Component;
  var events;
  var viewModel;
  var handler;

  beforeAll(function () {
    Component = GGRC.Components.get('objectSearch');
    events = Component.prototype.events;
  });
  beforeEach(function () {
    viewModel = new can.Map(GGRC.Components.getViewModel('objectSearch'));
  });

  describe('viewModel() method', function () {
    it('returns object with function "isLoadingOrSaving"', function () {
      var result = Component.prototype.viewModel();
      expect(result.isLoadingOrSaving).toEqual(jasmine.any(Function));
    });

    describe('isLoadingOrSaving() method', function () {
      beforeEach(function () {
        viewModel = new can.Map(Component.prototype.viewModel());
      });
      it('returns true if mapper is loading', function () {
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

  describe('"inserted" event', function () {
    var that;

    beforeEach(function () {
      viewModel.attr('mapper', {
        afterShown: function () {}
      });
      that = {
        viewModel: viewModel,
        setModel: jasmine.createSpy('setModel')
      };
      handler = events.inserted;
    });

    it('calls setModel()', function () {
      handler.call(that);
      expect(that.setModel).toHaveBeenCalled();
    });
  });

  describe('"setModel" handler', function () {
    beforeEach(function () {
      viewModel.attr('mapper', {
        modelFromType: function () {}
      });
      spyOn(viewModel.mapper, 'modelFromType')
        .and.returnValue('mockModel');
      handler = events.setModel;
    });
    it('sets model to mapper.model', function () {
      handler.call({viewModel: viewModel});
      expect(viewModel.attr('model')).toEqual('mockModel');
    });
  });

  describe('"{mapper} type" handler', function () {
    var that;
    beforeEach(function () {
      viewModel.attr('mapper', {
        relevant: [1, 2, 3],
        onSubmit: function () {}
      });
      that = {
        viewModel: viewModel,
        setModel: jasmine.createSpy()
      };
      handler = events['{mapper} type'];
    });

    it('sets empty string to mapper.filter', function () {
      handler.call(that);
      expect(viewModel.attr('filter')).toEqual('');
    });
    it('sets false to mapper.afterSearch', function () {
      handler.call(that);
      expect(viewModel.attr('afterSearch')).toEqual(false);
    });
    it('calls setModel()', function () {
      handler.call(that);
      expect(that.setModel).toHaveBeenCalled();
    });
    it('sets empty array to mapper.relevant if it is not in scope model',
      function () {
        spyOn(GGRC.Utils.Snapshots, 'isInScopeModel')
          .and.returnValue(false);
        handler.call(that);
        expect(viewModel.attr('relevant').length)
          .toEqual(0);
      });
  });
});
