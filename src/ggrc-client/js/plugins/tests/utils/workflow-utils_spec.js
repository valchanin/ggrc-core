/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import * as workflowHelpers from '../../utils/workflow-utils';
import {
  makeFakeInstance,
} from '../../../../js_specs/spec_helpers';
import * as businessModels from '../../../models/business-models';

describe('Workflow helpers', () => {
  describe('createCycle() method', () => {
    describe('returns cycle instance which contains', () => {
      let workflow;

      beforeEach(function () {
        workflow = makeFakeInstance({model: businessModels.Workflow})();
        workflow.context = {
          stub: jasmine.createSpy('stub'),
        };
      });

      it('workflow equals to workflow stub object', function () {
        const stubType = 'Workflow';
        const stub = {
          id: 123,
          type: stubType,
        };
        let wfStub;
        workflow.attr('id', stub.id);
        wfStub = workflowHelpers
          .createCycle(workflow)
          .attr('workflow');
        expect(wfStub.attr()).toEqual(stub);
      });

      it('autogenerate property equals to true', function () {
        const {autogenerate} = workflowHelpers.createCycle(workflow);
        expect(autogenerate).toBe(true);
      });
    });
  });

  describe('updateStatus() method', () => {
    let instance;
    let refreshedInstance;

    beforeEach(function () {
      refreshedInstance = new can.Map({
        save: jasmine.createSpy('save'),
      });
      instance = new can.Map({
        refresh: jasmine.createSpy('refresh')
          .and.returnValue(refreshedInstance),
      });
    });

    it('refreshes passed instance', async function (done) {
      await workflowHelpers.updateStatus(instance);
      expect(instance.refresh).toHaveBeenCalled();
      done();
    });

    it('sets passed status for refreshed instance before saving',
      async function (done) {
        const status = 'New Status';
        spyOn(refreshedInstance, 'attr');
        await workflowHelpers.updateStatus(instance, status);
        expect(refreshedInstance.attr).toHaveBeenCalledWith('status', status);
        expect(refreshedInstance.attr).toHaveBeenCalledBefore(
          refreshedInstance.save
        );
        done();
      });

    it('returns saved instance', async function (done) {
      const saved = {};
      refreshedInstance.save.and.returnValue(saved);
      const result = await workflowHelpers.updateStatus(instance);
      expect(result).toBe(saved);
      done();
    });
  });
});
