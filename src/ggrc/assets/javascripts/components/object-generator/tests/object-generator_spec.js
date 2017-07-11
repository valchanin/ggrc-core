/*!
  Copyright (C) 2017 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

describe('GGRC.Components.objectGenerator', function () {
  'use strict';

  var Component;
  var events;
  var scope;
  var handler;

  beforeAll(function () {
    Component = GGRC.Components.get('objectGenerator');
    events = Component.prototype.events;
  });
  beforeEach(function () {
    scope = GGRC.Components.getViewModel('objectGenerator');
  });

  describe('scope() method', function () {
    var el;
    var parentScope;

    beforeEach(function () {
      el = new can.Map();
      parentScope = new can.Map();
    });
    it('returns object with function "isLoadingOrSaving"', function () {
      var result = Component.prototype.scope({}, parentScope, el);
      expect(result.isLoadingOrSaving).toEqual(jasmine.any(Function));
    });

    describe('isLoadingOrSaving() method', function () {
      beforeEach(function () {
        scope = new can.Map(Component.prototype.scope({}, parentScope, el));
      });
      it('returns true if it is saving', function () {
        scope.attr('is_saving', true);
        expect(scope.isLoadingOrSaving()).toEqual(true);
      });
      it('returns true if type change is blocked', function () {
        scope.attr('block_type_change', true);
        expect(scope.isLoadingOrSaving()).toEqual(true);
      });
      it('returns true if mapper is loading', function () {
        scope.attr('is_loading', true);
        expect(scope.isLoadingOrSaving()).toEqual(true);
      });
      it('returns false if page is not loading, it is not saving,' +
      ' type change is not blocked and mapper is not loading', function () {
        scope.attr('is_saving', false);
        scope.attr('block_type_change', false);
        scope.attr('is_loading', false);
        expect(scope.isLoadingOrSaving()).toEqual(false);
      });
    });
  });

  describe('"inserted" event', function () {
    var that;

    beforeEach(function () {
      scope.attr('mapper', {
        selected: [1, 2, 3],
        entries: [3, 2, 1],
        afterShown: function () {}
      });
      that = {
        scope: scope,
        setModel: jasmine.createSpy('setModel')
      };
      handler = events.inserted;
    });

    it('sets empty array to mapper.selected', function () {
      handler.call(that);
      expect(scope.attr('selected').length)
        .toEqual(0);
    });
    it('sets empty array to mapper.entries', function () {
      handler.call(that);
      expect(scope.attr('entries').length)
        .toEqual(0);
    });
    it('calls setModel()', function () {
      handler.call(that);
      expect(that.setModel).toHaveBeenCalled();
    });
  });

  describe('"closeModal" event', function () {
    var element;
    var spyObj;

    beforeEach(function () {
      scope.attr('mapper', {});
      spyObj = {
        trigger: function () {}
      };
      element = {
        find: function () {
          return spyObj;
        }
      };
      spyOn(spyObj, 'trigger');
      handler = events.closeModal;
    });

    it('sets false to mapper.is_saving', function () {
      scope.attr('is_saving', true);
      handler.call({
        element: element,
        scope: scope
      });
      expect(scope.attr('s_saving')).toEqual(false);
    });
    it('dismiss the modal', function () {
      handler.call({
        element: element,
        scope: scope
      });
      expect(spyObj.trigger).toHaveBeenCalledWith('click');
    });
  });

  describe('".modal-footer .btn-map click" handler', function () {
    var that;
    var event;
    var element;
    var callback;

    beforeEach(function () {
      callback = jasmine.createSpy().and.returnValue('expectedResult');
      scope.attr('mapper', {
        callback: callback,
        type: 'type',
        object: 'Program',
        assessmentTemplate: 'template',
        join_object_id: '123',
        selected: []
      });
      spyOn(CMS.Models.Program, 'findInCacheById')
        .and.returnValue('instance');
      event = {
        preventDefault: function () {}
      };
      element = $('<div></div>');
      handler = events['.modal-footer .btn-map click'];
      that = {
        scope: scope,
        closeModal: jasmine.createSpy()
      };
      spyOn(window, 'RefreshQueue')
        .and.returnValue({
          enqueue: function () {
            return {
              trigger: jasmine.createSpy()
                .and.returnValue(can.Deferred().resolve())
            };
          }
        });
      spyOn($.prototype, 'trigger');
    });

    it('does nothing if element has class "disabled"', function () {
      var result;
      element.addClass('disabled');
      result = handler.call(that, element, event);
      expect(result).toEqual(undefined);
    });

    it('sets true to mapper.is_saving and' +
      'returns callback if it is assessment generation', function () {
      var result;
      scope.attr('assessmentGenerator', true);
      result = handler.call(that, element, event);
      expect(scope.attr('is_saving')).toEqual(true);
      expect(result).toEqual('expectedResult');
      expect(callback.calls.argsFor(0)[0].length)
        .toEqual(0);
      expect(callback.calls.argsFor(0)[1]).toEqual({
        type: 'type',
        target: 'Program',
        instance: 'instance',
        assessmentTemplate: 'template',
        context: that
      });
    });
  });

  describe('"setModel" handler', function () {
    beforeEach(function () {
      scope.attr('mapper', {
        modelFromType: function () {}
      });
      spyOn(scope.mapper, 'modelFromType')
        .and.returnValue('mockModel');
      handler = events.setModel;
    });
    it('sets model to mapper.model', function () {
      handler.call({scope: scope});
      expect(scope.attr('model')).toEqual('mockModel');
    });
  });

  describe('"{mapper} type" handler', function () {
    var that;
    beforeEach(function () {
      scope.attr('mapper', {
        assessmentGenerator: true,
        relevant: [1, 2, 3],
        onSubmit: function () {}
      });
      that = {
        scope: scope,
        setModel: jasmine.createSpy()
      };
      handler = events['{mapper} type'];
    });

    it('sets empty string to mapper.filter', function () {
      handler.call(that);
      expect(scope.attr('filter')).toEqual('');
    });
    it('sets false to mapper.afterSearch', function () {
      handler.call(that);
      expect(scope.attr('afterSearch')).toEqual(false);
    });
    it('calls setModel()', function () {
      handler.call(that);
      expect(that.setModel).toHaveBeenCalled();
    });
  });

  describe('"{mapper} assessmentTemplate" handler', function () {
    beforeEach(function () {
      scope.attr('mapper', {

      });
      handler = events['{mapper} assessmentTemplate'];
    });

    it('sets false to mapper.block_type_change if value is empty',
      function () {
        handler.call({scope: scope});
        expect(scope.attr('block_type_change'))
          .toEqual(false);
      });
    it('sets true to mapper.block_type_change if value is not empty',
      function () {
        handler.call({scope: scope}, scope, {}, 'mock-value');
        expect(scope.attr('block_type_change'))
          .toEqual(true);
      });
    it('sets type to mapper.type if value is not empty',
      function () {
        handler.call({scope: scope}, scope, {}, 'mock-value');
        expect(scope.attr('type'))
          .toEqual('value');
      });
  });
});
