/*
  Copyright (C) 2018 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import * as snapshotUtils from '../../../plugins/utils/snapshot-utils';
import Cacheable from '../../cacheable';

describe('can.Model.Mixin.accessControlList', () => {
  describe('"cleanupAcl" method: ', () => {
    let resource;
    let objectFromResourceSpy;
    let model;
    let id;

    beforeEach(() => {
      id = 711;
      objectFromResourceSpy =
        spyOn(Cacheable, 'object_from_resource');
      model = new CMS.Models.Control({id: id});
    });

    afterEach(() => {
      delete Cacheable.cache;
    });

    it('returns resource if there is no object', () => {
      resource = {};
      objectFromResourceSpy.and.returnValue(undefined);

      expect(model.cleanupAcl(resource)).toEqual(resource);
    });

    it('sets empty array to access_control_list attribute ' +
    'if there is object with specified id in cache', () => {
      model.attr('access_control_list', [1, 2, 3]);
      resource = {id: id};
      objectFromResourceSpy.and.returnValue(resource);

      model.cleanupAcl(resource);
      expect(model.attr('access_control_list').length).toBe(0);
    });

    it('returns resource if there is no object with specified id in cache',
      () => {
        let acl = [1, 2, 3];
        model.attr('access_control_list', acl);
        resource = {id: id + 1};
        objectFromResourceSpy.and.returnValue(resource);

        let result = model.cleanupAcl(resource);
        expect(result).toEqual(resource);
        expect(model.attr('access_control_list').attr()).toEqual(acl);
      }
    );

    it('should clear ACL if "resource" param is undefined', () => {
      let acl = [1, 2, 3];
      model.attr('access_control_list', acl);
      model.cleanupAcl();
      expect(model.attr('access_control_list').length).toBe(0);
    });

    it('should not clear ACL if model is snapshot', () => {
      spyOn(snapshotUtils, 'isSnapshot').and.returnValue(true);
      let acl = [1, 2, 3];
      model.attr('access_control_list', acl);
      model.cleanupAcl();
      expect(model.attr('access_control_list').attr()).toEqual(acl);
    });
  });
});
