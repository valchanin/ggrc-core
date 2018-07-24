/*
  Copyright (C) 2018 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {resolveDeferredBindings} from '../../utils/models-utils';
import {makeFakeModel} from '../../../../js_specs/spec_helpers';
import Cacheable from '../../../models/cacheable';
import * as businessModels from '../../../models/business-models';


describe('models-utils module', () => {
  describe('resolveDeferredBindings() util', function () {
    let origDummyModel;
    let origDummyJoin;

    beforeAll(function () {
      origDummyModel = businessModels.DummyModel;
      origDummyJoin = businessModels.DummyJoin;
    });

    afterAll(function () {
      businessModels.DummyModel = origDummyModel;
      businessModels.DummyJoin = origDummyJoin;
    });

    beforeEach(function () {
      businessModels.DummyModel = makeFakeModel({model: Cacheable});
      businessModels.DummyJoin = makeFakeModel({model: Cacheable});
    });

    it('iterates _pending_joins, calling refresh_stubs on each binding',
      function () {
        let instance = jasmine.createSpyObj('instance', ['get_binding']);
        let binding = jasmine.createSpyObj('binding', ['refresh_stubs']);
        instance._pending_joins = [{what: {}, how: 'add', through: 'foo'}];
        instance.get_binding.and.returnValue(binding);
        spyOn($.when, 'apply').and.returnValue(new $.Deferred().reject());

        resolveDeferredBindings(instance);
        expect(binding.refresh_stubs).toHaveBeenCalled();
      });

    describe('add case', function () {
      let instance;
      let binding;
      let dummy;
      beforeEach(function () {
        dummy = new businessModels.DummyModel({id: 1});
        instance = jasmine.createSpyObj('instance',
          ['get_binding', 'isNew', 'refresh', 'attr', 'dispatch']);
        binding = jasmine.createSpyObj('binding', ['refresh_stubs']);
        instance._pending_joins = [{what: dummy, how: 'add', through: 'foo'}];
        instance.isNew.and.returnValue(false);
        instance.get_binding.and.returnValue(binding);
        binding.loader = {model_name: 'DummyJoin'};
        binding.list = [];
        spyOn(businessModels.DummyJoin, 'newInstance');
        spyOn(businessModels.DummyJoin.prototype, 'save');
      });

      it('creates a proxy object when it does not exist', function () {
        resolveDeferredBindings(instance);
        expect(businessModels.DummyJoin.newInstance).toHaveBeenCalled();
        expect(businessModels.DummyJoin.prototype.save).toHaveBeenCalled();
      });

      it('does not create proxy object when it already exists', function () {
        binding.list.push({instance: dummy});
        resolveDeferredBindings(instance);
        expect(businessModels.DummyJoin.newInstance).not.toHaveBeenCalled();
        expect(businessModels.DummyJoin.prototype.save).not.toHaveBeenCalled();
      });
    });

    describe('remove case', function () {
      let instance;
      let binding;
      let dummy;
      let dummy_join;
      beforeEach(function () {
        dummy = new businessModels.DummyModel({id: 1});
        dummy_join = new businessModels.DummyJoin({id: 1});
        instance = jasmine.createSpyObj('instance',
          ['get_binding', 'isNew', 'refresh', 'attr', 'dispatch']);
        binding = jasmine.createSpyObj('binding', ['refresh_stubs']);
        instance._pending_joins = [{what: dummy, how: 'remove', through: 'foo'}];
        instance.isNew.and.returnValue(false);
        instance.get_binding.and.returnValue(binding);
        binding.loader = {model_name: 'DummyJoin'};
        binding.list = [];
        spyOn(businessModels.DummyJoin, 'newInstance');
        spyOn(businessModels.DummyJoin.prototype, 'save');
      });

      it('removes proxy object if it exists', function () {
        binding.list.push({instance: dummy, get_mappings: function () {
          return [dummy_join];
        }});
        spyOn(dummy_join, 'refresh').and.returnValue($.when());
        spyOn(dummy_join, 'destroy');
        resolveDeferredBindings(instance);
        expect(dummy_join.destroy).toHaveBeenCalled();
      });
    });
  });
});

