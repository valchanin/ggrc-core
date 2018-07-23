/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Cacheable from '../../js/models/cacheable';
import {
  failAll,
  makeFakeModel,
} from '../spec_helpers';
import CustomAttributeObject from '../../js/plugins/utils/custom-attribute/custom-attribute-object';
import * as modelUtils from '../../js/plugins/utils/models-utils';

describe('Cacheable model', function () {
  let origGcaDefs;
  let DummyModel;

  beforeEach(function () {
    origGcaDefs = GGRC.custom_attr_defs;
    can.Model.Mixin('dummyable');
    spyOn(CMS.Models.Mixins.dummyable, 'add_to');

    DummyModel = makeFakeModel({
      model: Cacheable,
      staticProps: {
        root_object: 'dummy_model',
        root_collection: 'dummy_models',
        // The string update key has to be here to make the update conflict tests work.
        //  See Cacheable.init for details on how the software
        //  under test is broken. --BM
        findOne: 'GET /api/dummy_models/{id}',
        findAll: 'GET /api/dummy_models/',
        update: 'PUT /api/dummy_models/{id}',
        mixins: ['dummyable'],
        attributes: {dummy_attribute: 'dummy_convert'},
        is_custom_attributable: true,
      },
    });
  });

  afterEach(function () {
    GGRC.custom_attr_defs = origGcaDefs;
  });

  describe('::setup', function () {
    it('prefers pre-set static names over root object & collection', function () {
      let Model = Cacheable.extend('CMS.Models.Dummy', {
        root_object: 'wrong_name',
        root_collection: 'wrong_names',
        model_singular: 'RightName',
        table_singular: 'right_name',
        title_singular: 'Right Name',
        model_plural: 'RightNames',
        table_plural: 'right_names',
        title_plural: 'Right Names',
      }, {});
      // note that these are not explicit in beforeAll above.
      // model singular is CamelCased form of root_object
      expect(Model.model_singular).toBe('RightName');
      // table singular is under_scored version of same
      expect(Model.table_singular).toBe('right_name');
      // title singular is "Human Readable" version of same
      expect(Model.title_singular).toBe('Right Name');
      // plurals are based on root collection.
      expect(Model.model_plural).toBe('RightNames');
      expect(Model.table_plural).toBe('right_names');
      expect(Model.title_plural).toBe('Right Names');
      delete CMS.Models.Dummy;
    });

    it('sets various forms of the name based on root object & collection by default', function () {
      // note that these are not explicit in beforeAll above.
      // model singular is CamelCased form of root_object
      expect(DummyModel.model_singular).toBe('DummyModel');
      // table singular is under_scored version of same
      expect(DummyModel.table_singular).toBe('dummy_model');
      // title singular is "Human Readable" version of same
      expect(DummyModel.title_singular).toBe('Dummy Model');
      // plurals are based on root collection.
      expect(DummyModel.model_plural).toBe('DummyModels');
      expect(DummyModel.table_plural).toBe('dummy_models');
      expect(DummyModel.title_plural).toBe('Dummy Models');
    });

    it('sets findAll to default based on root_collection if not set', function () {
      spyOn(can.Model, 'setup');
      let DummyFind = Cacheable.extend({root_collection: 'foos'}, {});
      expect(DummyFind.findAll).toBe('GET /api/foos');
    });

    it('applies mixins based on the mixins property', function () {
      expect(CMS.Models.Mixins.dummyable.add_to)
        .toHaveBeenCalledWith(DummyModel);
    });

    it('merges in default attributes for created_at and updated_at', function () {
      expect(DummyModel.attributes).toEqual({
        created_at: 'datetime',
        updated_at: 'datetime',
        dummy_attribute: 'dummy_convert',
      });
    });
  });

  describe('::init', function () {
    it('sets custom attributes', function () {
      // NB using $.extend here creates a new object with all of the static properties of the function.
      //  This is how the custom attributable is implemented in setup.
      expect(GGRC.custom_attributable_types)
        .toContain($.extend({}, DummyModel));
    });
  });

  describe('::update', function () {
    let _obj;

    beforeEach(function (done) {
      const id = 0;
      _obj = new DummyModel({id});
      done();
    });

    it('processes args before sending', function (done) {
      let obj = _obj;
      spyOn(DummyModel, 'process_args');
      spyOn(can, 'ajax').and.returnValue($.when({}));
      DummyModel.update(obj.id, obj).then(function () {
        expect(DummyModel.process_args).toHaveBeenCalledWith(obj);
        done();
      });
    });

    it('calls resolveDeferredBindings after send success', function (done) {
      let obj = _obj;
      spyOn(modelUtils, 'resolveDeferredBindings')
        .and
        .returnValue(obj);
      spyOn(can, 'ajax').and.returnValue($.when({dummy_model: {id: obj.id}}));
      DummyModel
        .update(obj.id, obj.serialize())
        .then(function () {
          expect(modelUtils.resolveDeferredBindings)
            .toHaveBeenCalledWith(obj);
          setTimeout(done, 10);
        }, failAll(done));
    });
  });

  describe('::findAll', function () {
    it('throws errors when called directly on Cacheable instead of a subclass', function () {
      expect(Cacheable.findAll)
        .toThrow(
          new Error('No default findAll() exists for subclasses of Cacheable')
        );
    });

    it('unboxes collections when passed back from the find', function (done) {
      spyOn(can, 'ajax').and.returnValue($.when({dummy_models_collection: {dummy_models: [{id: 1}]}}));
      DummyModel.findAll().then(function (data) {
        expect(can.ajax).toHaveBeenCalled();
        expect(data).toEqual(jasmine.any(can.List));
        expect(data.length).toBe(1);
        expect(data[0]).toEqual(jasmine.any(DummyModel));
        expect(data[0]).toEqual(jasmine.objectContaining({id: 1}));
        done();
      }, failAll(done));
    });

    it('makes a collection of a single object when passed back from the find', function (done) {
      spyOn(can, 'ajax').and.returnValue($.when({id: 1}));
      DummyModel.findAll().then(function (data) {
        expect(can.ajax).toHaveBeenCalled();
        expect(data).toEqual(jasmine.any(can.List));
        expect(data.length).toBe(1);
        expect(data[0]).toEqual(jasmine.any(DummyModel));
        expect(data[0]).toEqual(jasmine.objectContaining({id: 1}));
        done();
      }, failAll(done));
    });

    // NB -- This unit test is brittle.  It's difficult to unit test for
    //  things like timing, and it's a bit of a hack to spy on Date.now()
    //  since that function is used in more places than just our modelize function.
    //  -- BM 2015-02-03
    it('only pushes instances into the list for 100ms before yielding', function (done) {
      let list = new DummyModel.List();
      let dummy_models = [
        {id: 1}, {id: 2}, {id: 3}, {id: 4}, {id: 5}, {id: 6}, {id: 7},
      ];
      // Have our modelized instances ready for when
      let dummy_insts = DummyModel.models(dummy_models);
      // we want to see how our observable list gets items over time, so spy on the push method
      spyOn(list, 'push').and.callThrough();
      spyOn(can, 'ajax').and.returnValue($.when(dummy_models));
      let st = 3; // preload Date.now() because it's called once before we even get to modelizing
      spyOn(Date, 'now').and.callFake(function () {
        // Date.now() is called once per item.
        if ((++st % 5) === 0)
          st += 100; // after three, push the time ahead 100ms to force a new call to modelizeMS
        return st;
      });
      // return model instances for the list of returned items from the server
      spyOn(DummyModel.List, 'newInstance').and.returnValue(list);
      // spy so we don't return the list to observe more than once.  That is,
      //  models calls new DummyModel.List() which we're already spying out,
      //  so spy models() out in order to *not* call it.
      spyOn(DummyModel, 'models').and.callFake(function (items) {
        let ids = can.map(items, function (item) { return item.id; });
        return can.map(dummy_insts, function (inst) {
          return ~can.inArray(inst.id, ids) ? inst : undefined;
        });
      });
      DummyModel.findAll().then(function () {
        // finally, we show that with the 100ms gap between pushing ids 3 and 4, we force a separate push.
        expect(list.push).toHaveBeenCalledWith(
          jasmine.objectContaining({id: 1}),
          jasmine.objectContaining({id: 2}),
          jasmine.objectContaining({id: 3})
        );
        expect(list.push).toHaveBeenCalledWith(
          jasmine.objectContaining({id: 4}),
          jasmine.objectContaining({id: 5}),
          jasmine.objectContaining({id: 6})
        );
        expect(list.push).toHaveBeenCalledWith(
          jasmine.objectContaining({id: 7})
        );
        done();
      }, failAll(done));
    });
  });

  describe('::findPage', function () {
    it('throws errors when called directly on Cacheable instead of a subclass', function () {
      expect(Cacheable.findPage)
        .toThrow(
          new Error('No default findPage() exists for subclasses of Cacheable')
        );
    });
  });

  describe('#refresh', function () {
    let inst;
    beforeEach(function () {
      inst = new DummyModel({href: '/api/dummy_models/1'});
      spyOn(can, 'ajax').and.returnValue(new $.Deferred(function (dfd) {
        setTimeout(function () {
          dfd.resolve(inst.serialize());
        }, 10);
      }));
    });

    it('calls the object endpoint with the supplied href if no selfLink', function (done) {
      inst.refresh().then(function () {
        expect(can.ajax).toHaveBeenCalledWith(jasmine.objectContaining({
          url: '/api/dummy_models/1',
          type: 'get',
        }));
        done();
      }, fail);
    });

    it('throttles the requests to once per second', function (done) {
      inst.refresh();
      inst.refresh();
      setTimeout(function () {
        inst.refresh().then(function () {
          expect(can.ajax.calls.count()).toBe(2);
          done();
        }, fail);
      }, 1000); // 1000ms is enough to trigger a new call to the debounced function
      inst.refresh().then(function () {
        expect(can.ajax.calls.count()).toBe(1);
      }, fail);
    });

    it('backs up the refreshed state immediately after refreshing', function (done) {
      spyOn(DummyModel, 'model').and.returnValue(inst);
      spyOn(inst, 'backup');
      inst.refresh().then(function () {
        expect(inst.backup).toHaveBeenCalled();
        done();
      }, fail);
    });
  });

  describe('::customAttr', () => {
    let instance;

    beforeEach(function () {
      instance = new DummyModel();
    });

    describe('when the instance is not custom attributable', () => {
      beforeEach(function () {
        spyOn(instance, 'isCustomAttributable').and.returnValue(false);
      });

      it('throws Error', function () {
        expect(instance.customAttr.bind(instance)).toThrow();
      });
    });

    describe('when count of arguments is 0', () => {
      it('returns all custom attriubtes', function () {
        const customAttrs = new can.List([]);
        let result;
        spyOn(instance, '_getAllCustomAttr').and.returnValue(customAttrs);
        result = instance.customAttr();
        expect(result).toBe(customAttrs);
      });
    });

    describe('when count of arguments is 1', () => {
      it('returns certain custom attribute object by ca id', function () {
        const caId = 12345;
        const caObject = new CustomAttributeObject(
          new can.Map(),
          new can.Map()
        );
        const getCA = spyOn(instance, '_getCustomAttr')
          .and.returnValue(caObject);
        let result;
        result = instance.customAttr(caId);
        expect(result).toBe(caObject);
        expect(getCA).toHaveBeenCalledWith(caId);
      });
    });

    describe('when count of arguments is 2', () => {
      it('sets value for caObject which has certain ca id', function () {
        const caId = 12345;
        const value = 'Value 1';
        const setCA = spyOn(instance, '_setCustomAttr');
        instance.customAttr(caId, value);
        expect(setCA).toHaveBeenCalledWith(caId, value);
      });
    });
  });

  describe('::_getAllCustomAttr', () => {
    it('returns all custom attributes', function () {
      const caDefs = [{id: 1}, {id: 2}, {id: 3}];
      const instance = new DummyModel({
        custom_attribute_definitions: caDefs,
      });
      const caObjects = instance._getAllCustomAttr();
      caObjects.forEach((caObject, index) => {
        expect(caObject.customAttributeId).toEqual(caDefs[index].id);
      });
    });
  });

  describe('::_getCustomAttr', () => {
    it('returns certain custom attribute object by custom attribute id',
      function () {
        const caId = 2;
        const caDefs = [{id: 1}, {id: caId}, {id: 3}];
        const instance = new DummyModel({
          custom_attribute_definitions: caDefs,
        });
        const caObject = instance._getCustomAttr(caId);
        expect(caObject.customAttributeId).toBe(caId);
      });
  });

  describe('::_setCustomAttr', () => {
    it('writes some value for certain caObject', function () {
      const caId = 2;
      const expectedValue = 'Some value';
      const caDefs = [
        {
          id: 1,
        }, {
          id: caId,
          value: 'Abcdefg',
        }, {
          id: 3,
        }];
      const instance = new DummyModel({
        custom_attribute_definitions: caDefs,
      });
      instance._setCustomAttr(caId, expectedValue);
      expect(instance.customAttr(caId).value).toBe(expectedValue);
    });

    it('converts string ca id to number', function () {
      const caId = '2';
      const expectedValue = 'Some value';
      const caDefs = [
        {
          id: 1,
        }, {
          id: Number(caId),
          value: 'Abcdefg',
        }, {
          id: 3,
        }];
      const instance = new DummyModel({
        custom_attribute_definitions: caDefs,
      });
      let value;
      instance._setCustomAttr(caId, expectedValue);
      value = instance.customAttr(Number(caId)).value;
      expect(value).toBe(expectedValue);
    });
  });

  describe('::isCustomAttributable', () => {
    let instance;

    beforeEach(function () {
      instance = new DummyModel();
    });

    it('returns true if the instance is custom attributable', function () {
      const result = instance.isCustomAttributable();
      expect(result).toBe(true);
    });

    it('returns false if the instance is not custom attributable', function () {
      let result;
      instance.constructor.is_custom_attributable = false;
      result = instance.isCustomAttributable();
      expect(result).toBe(false);
    });
  });

  describe('::updateCaObjects', () => {
    let instance;

    beforeEach(function () {
      instance = new DummyModel();
    });

    describe('when ca values are defined and the current model is custom' +
    'attributable', () => {
      let caValues;

      beforeEach(function () {
        caValues = [];
        spyOn(instance, 'isCustomAttributable').and.returnValue(true);
        instance.init();
      });

      it('updates ca objects with appropriate ca values', function () {
        const update = spyOn(instance._customAttributeAccess,
          'updateCaObjects');
        instance.updateCaObjects(caValues);
        expect(update).toHaveBeenCalledWith(caValues);
      });
    });
  });
});
