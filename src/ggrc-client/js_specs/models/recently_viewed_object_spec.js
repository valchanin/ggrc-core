/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import RecentlyViewedObject from '../../js/models/local-storage/recently-viewed-object';

describe('RecentlyViewedObject model', function () {

  describe('::newInstance', function () {
    it('creates a new recently viewed object given non-Model instance', function () {
      let obj = RecentlyViewedObject.newInstance({'foo': 'bar'});
      expect(obj.foo).toBe('bar');
      expect(obj instanceof RecentlyViewedObject).toBeTruthy();
    });

    it('references original Model type when passed in as argument', function () {
      spyOn(RecentlyViewedObject.prototype, 'init');
      can.Model('RVO');
      let obj = new RVO({
        viewLink: '/',
        title: 'blah',
      });
      let rvo_obj = RecentlyViewedObject.newInstance(obj);
      expect(rvo_obj.type).toBe('RVO');
      expect(rvo_obj.model).toBe(RVO);
      expect(rvo_obj.viewLink).toBe('/');
      expect(rvo_obj.title).toBe('blah');
    });
  });

  describe('#stub', function () {
    it('include title and view link', function () {
      let obj = {
        viewLink: '/',
        title: 'blah',
      };
      let rvo_obj = new RecentlyViewedObject(obj).stub();
      expect(rvo_obj.title).toBe('blah');
      expect(rvo_obj.viewLink).toBe('/');
      expect(rvo_obj.id).not.toBeDefined();
    });
  });
});
