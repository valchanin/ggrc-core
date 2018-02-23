/*
  Copyright (C) 2018 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {getComponentVM} from '../../../../js_specs/spec_helpers';
import Component from '../assessment-modal';
import * as SnapshotUtils from '../../../plugins/utils/snapshot-utils';

describe('<assessment-modal/> component', () => {
  let vm;

  beforeEach(() => {
    vm = getComponentVM(Component);

    spyOn(SnapshotUtils, 'toObject').and.returnValue({
      'class': {},
      title: 'Foo',
      description: 'Bar',
      originalLink: 'Baz',
    });
  });

  describe('loadData() method', () => {
    it('sets the correct data', (done) => {
      let model = new CMS.Models.Assessment();

      spyOn(model, 'getRelatedObjects').and
        .returnValue(can.Deferred().resolve({
          Audit: {},
          'Evidence:REFERENCE_URL': [{}],
          Issue: [{}, {}],
          Snapshot: [{}, {}, {}],
        }));

      vm.attr('instance', model);

      vm.loadData().then(() => {
        expect(vm.attr('referenceUrls').length).toBe(1);
        expect(vm.attr('mappedObjects').length).toBe(6);

        done();
      });
    });
  });
});
