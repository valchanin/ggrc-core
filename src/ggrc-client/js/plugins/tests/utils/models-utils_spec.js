/*
  Copyright (C) 2018 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {resolveDeferredBindings} from '../../utils/models-utils';
import {makeFakeModel} from '../../../../js_specs/spec_helpers';
import Cacheable from '../../../models/cacheable';

describe('models-utils module', () => {
  describe('resolveDeferredBindings() util', function () {
    let origDummyModel;
    let origDummyJoin;

    beforeAll(function () {
      origDummyModel = CMS.Models.DummyModel;
      origDummyJoin = CMS.Models.DummyJoin;
    });

    afterAll(function () {
      CMS.Models.DummyModel = origDummyModel;
      CMS.Models.DummyJoin = origDummyJoin;
    });

    beforeEach(function () {
      CMS.Models.DummyModel = makeFakeModel({model: Cacheable});
      CMS.Models.DummyJoin = makeFakeModel({model: Cacheable});
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
        dummy = new CMS.Models.DummyModel({id: 1});
        instance = jasmine.createSpyObj('instance',
          ['get_binding', 'isNew', 'refresh', 'attr', 'dispatch']);
        binding = jasmine.createSpyObj('binding', ['refresh_stubs']);
        instance._pending_joins = [{what: dummy, how: 'add', through: 'foo'}];
        instance.isNew.and.returnValue(false);
        instance.get_binding.and.returnValue(binding);
        binding.loader = {model_name: 'DummyJoin'};
        binding.list = [];
        spyOn(CMS.Models.DummyJoin, 'newInstance');
        spyOn(CMS.Models.DummyJoin.prototype, 'save');
      });

      it('creates a proxy object when it does not exist', function () {
        resolveDeferredBindings(instance);
        expect(CMS.Models.DummyJoin.newInstance).toHaveBeenCalled();
        expect(CMS.Models.DummyJoin.prototype.save).toHaveBeenCalled();
      });

      it('does not create proxy object when it already exists', function () {
        binding.list.push({instance: dummy});
        resolveDeferredBindings(instance);
        expect(CMS.Models.DummyJoin.newInstance).not.toHaveBeenCalled();
        expect(CMS.Models.DummyJoin.prototype.save).not.toHaveBeenCalled();
      });
    });

    describe('remove case', function () {
      let instance;
      let binding;
      let dummy;
      let dummy_join;
      beforeEach(function () {
        dummy = new CMS.Models.DummyModel({id: 1});
        dummy_join = new CMS.Models.DummyJoin({id: 1});
        instance = jasmine.createSpyObj('instance',
          ['get_binding', 'isNew', 'refresh', 'attr', 'dispatch']);
        binding = jasmine.createSpyObj('binding', ['refresh_stubs']);
        instance._pending_joins = [{what: dummy, how: 'remove', through: 'foo'}];
        instance.isNew.and.returnValue(false);
        instance.get_binding.and.returnValue(binding);
        binding.loader = {model_name: 'DummyJoin'};
        binding.list = [];
        spyOn(CMS.Models.DummyJoin, 'newInstance');
        spyOn(CMS.Models.DummyJoin.prototype, 'save');
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

