/*
  Copyright (C) 2018 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Cacheable from '../cacheable';
import {makeFakeInstance} from '../../../js_specs/spec_helpers';

describe('Cacheable model', function () {
  describe('mark_for_addition() method', function () {
    let instance;
    let obj;
    let extraAttrs;
    let options;
    let joinAttr;

    beforeEach(function () {
      instance = makeFakeInstance({model: Cacheable})({
        related_sources: new can.Map(),
      });
      spyOn(instance, 'remove_duplicate_pending_joins');
      obj = {};
      extraAttrs = {field: 'not empty'};
      options = 'options';
      joinAttr = 'related_sources';
    });

    afterEach(function () {
      delete Cacheable.cache;
    });

    it('calls remove_duplicate_pending_joins() method', function () {
      instance.mark_for_addition(joinAttr, obj, extraAttrs, options);
      expect(instance.remove_duplicate_pending_joins)
        .toHaveBeenCalledWith(obj);
    });

    it('pushes specified object to _pending_joins', function () {
      instance.mark_for_addition(joinAttr, obj, extraAttrs, options);
      obj = jasmine.objectContaining(obj);
      extraAttrs = jasmine.objectContaining(extraAttrs);

      expect(instance._pending_joins[0].how).toEqual('add');
      expect(instance._pending_joins[0].what).toEqual(obj);
      expect(instance._pending_joins[0].through).toEqual(joinAttr);
      expect(instance._pending_joins[0].extra).toEqual(extraAttrs);
      expect(instance._pending_joins[0].opts).toEqual(options);
    });
  });

  describe('remove_duplicate_pending_joins() method', function () {
    let instance;
    let obj;
    let extraAttrs;

    beforeEach(function () {
      instance = new Cacheable({
        related_sources: new can.Map(),
      });
      obj = new can.Map({});
      extraAttrs = new can.Map({field: 'not empty'});
    });

    afterEach(function () {
      delete Cacheable.cache;
    });

    it('sets empty array to _pending_joins if it is undefined', function () {
      instance.attr('_pending_joins', undefined);
      instance.remove_duplicate_pending_joins(obj);
      expect(instance._pending_joins.length).toEqual(0);
    });

    it('removes elemnts from _pending_joins' +
    'if elements fields "what" equals to parametr', function () {
      instance._pending_joins.push({
        what: obj,
      });
      instance.remove_duplicate_pending_joins(obj);
      expect(instance._pending_joins.length).toEqual(0);
    });

    it('does not remove elemnts from _pending_joins ' +
    'if elements field "what" does not equal to parametr', function () {
      instance._pending_joins.push({
        what: obj,
        extra: extraAttrs,
      });
      obj = new can.Map({});
      instance.remove_duplicate_pending_joins(obj, extraAttrs);
      expect(instance._pending_joins.length).toEqual(1);
    });
  });
});
