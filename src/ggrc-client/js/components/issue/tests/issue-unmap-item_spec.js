/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {getComponentVM} from '../../../../js_specs/spec_helpers';
import Component from '../issue-unmap-item';
import * as QueryAPI from '../../../plugins/utils/query-api-utils';
import * as CurrentPageUtils from '../../../plugins/utils/current-page-utils';
import * as businessModels from '../../../models/business-models';

describe('issue-unmap-related-snapshots component', ()=> {
  let viewModel;
  let events;
  beforeEach(()=> {
    viewModel = getComponentVM(Component);
    events = Component.prototype.events;
  });

  describe('paging value', ()=> {
    it('returns Pagination object with [5, 10, 15] pagination', ()=> {
      let pagination = viewModel.attr('paging');
      expect(pagination.attr('pageSizeSelect').serialize())
        .toEqual([5, 10, 15]);
    });
  });

  describe('buildQuery() method', ()=> {
    it('sets object_name to passed type', ()=> {
      let type = 'Type';
      let query = viewModel.buildQuery(type);
      expect(query.object_name).toBe(type);
    });

    it('sets limit to [0, 5]', ()=> {
      let query = viewModel.buildQuery('Type');
      expect(query.limit).toEqual([0, 5]);
    });

    describe('configures filters.expression namely', ()=> {
      it('sets assessment.id from viewModel.target.id', ()=> {
        let query;
        let id = 1234567;

        viewModel.attr('target.id', id);
        query = viewModel.buildQuery('Type');

        expect(query.filters.expression.assessment.id).toBe(id);
      });

      it('sets issue.id from viewModel.issueInstance.id', ()=> {
        let query;
        let id = 1234567;

        viewModel.attr('issueInstance.id', id);
        query = viewModel.buildQuery('Type');

        expect(query.filters.expression.issue.id).toBe(id);
      });

      it('sets op.name to "cascade_unmappable" string', ()=> {
        let operationName = 'cascade_unmappable';
        let query = viewModel.buildQuery('Type');
        expect(query.filters.expression.op.name).toBe(operationName);
      });
    });
  });

  describe('processRelatedSnapshots() method', ()=> {
    beforeEach(()=> {
      spyOn(viewModel, 'loadRelatedObjects')
        .and.returnValue(can.Deferred().resolve());
      spyOn(viewModel, 'showModal');
      spyOn(viewModel, 'unmap');
    });

    it('shows modal if there are items to unmap', ()=> {
      viewModel.attr('total', 2);

      viewModel.processRelatedSnapshots();

      expect(viewModel.showModal).toHaveBeenCalled();
      expect(viewModel.unmap).not.toHaveBeenCalled();
    });

    it('unmaps issue if there are no related items', ()=> {
      viewModel.attr('total', 0);

      viewModel.processRelatedSnapshots();

      expect(viewModel.showModal).not.toHaveBeenCalled();
      expect(viewModel.unmap).toHaveBeenCalledWith();
    });
  });

  describe('loadRelatedObjects() method', ()=> {
    let reqDeferred;
    let snapshotsResponse;
    let auditsResponse;

    beforeEach(()=> {
      snapshotsResponse = {
        Snapshot: {
          values: [{}, {}],
          total: 10,
        },
      };
      auditsResponse = {
        Audit: {
          values: [{}],
          total: 1,
        },
      };
      reqDeferred = can.Deferred();
      spyOn(viewModel, 'buildQuery').and.returnValue(['query']);
      spyOn(QueryAPI, 'batchRequests');
      spyOn(can, 'when').and.returnValue(reqDeferred);
      spyOn($.prototype, 'trigger');
    });

    it('should change "isLoading" flag in case of success', ()=> {
      viewModel.attr('isLoading', false);

      viewModel.loadRelatedObjects();
      expect(viewModel.attr('isLoading')).toBeTruthy();

      reqDeferred.resolve(snapshotsResponse, auditsResponse);
      expect(viewModel.attr('isLoading')).toBeFalsy();
    });

    it('should change "isLoading" flag in case of error', ()=> {
      viewModel.attr('isLoading', false);

      viewModel.loadRelatedObjects();
      expect(viewModel.attr('isLoading')).toBeTruthy();

      reqDeferred.reject();
      expect(viewModel.attr('isLoading')).toBeFalsy();
    });

    it('should load snapshots correctly', ()=> {
      viewModel.loadRelatedObjects();
      reqDeferred.resolve(snapshotsResponse, auditsResponse);

      expect(viewModel.attr('total')).toBe(11);
      expect(viewModel.attr('relatedSnapshots.length')).toBe(2);
      expect(viewModel.attr('paging.total')).toBe(10);
    });

    it('should handle server errors correctly', ()=> {
      viewModel.loadRelatedObjects();
      reqDeferred.reject();

      expect($.prototype.trigger).toHaveBeenCalledWith('ajax:flash', {
        error: 'There was a problem with retrieving related objects.',
      });
    });
  });

  describe('showModal() method', ()=> {
    it('updates singular title', ()=> {
      viewModel.attr('total', 1);

      viewModel.showModal();

      expect(viewModel.attr('modalTitle')).toBe('Unmapping (1 object)');
    });

    it('updates plural title', ()=> {
      viewModel.attr('total', 5);

      viewModel.showModal();

      expect(viewModel.attr('modalTitle')).toBe('Unmapping (5 objects)');
    });

    it('changes modal state', ()=> {
      viewModel.attr('modalState.open', false);

      viewModel.showModal();

      expect(viewModel.attr('modalState.open')).toBe(true);
    });
  });

  describe('openObject() method', ()=> {
    let relatedObject;
    let originalModels;
    let getParam;
    let ARGS;

    beforeAll(()=> {
      getParam = function (spy, index) {
        return spy.calls.argsFor(0)[index];
      };
      ARGS = {
        FIRST: 0,
        SECOND: 1,
      };
    });

    beforeEach(()=> {
      relatedObject = {
        id: 123,
        type: 'Type',
      };

      businessModels[relatedObject.type] = {
        root_collection: 'rootCollectionType',
      };

      spyOn(window, 'open');
    });

    afterEach(() => {
      businessModels[relatedObject.type] = null;
    });

    it('calls window.open with second "_blank" param', ()=> {
      let secondParam;
      viewModel.openObject(relatedObject);
      secondParam = getParam(window.open, ARGS.SECOND);
      expect(secondParam).toBe('_blank');
    });

    describe('sets url as a first param where', ()=> {
      let buildUrl;

      beforeAll(()=> {
        buildUrl = function (type, id) {
          return '/' + type + '/' + id;
        };
      });

      it(`url consists of root_collection from appopriate model and id
        based on passed related object`, ()=> {
          let rootCollectionType =
            businessModels[relatedObject.type].root_collection;
          let expectedUrl;

          viewModel.openObject(relatedObject);
          expectedUrl = buildUrl(rootCollectionType, relatedObject.id);

          expect(getParam(window.open, ARGS.FIRST)).toBe(expectedUrl);
        });

      it(`url consists of type and id from relatet object's child_type and
        child_id props if a type of related object equals to "Snapshot"`, ()=> {
          let relatedObjectType = 'Snapshot';
          let rootCollectionType =
            businessModels[relatedObject.type].root_collection;
          let oldRelatedObjectType = relatedObject.type;
          let expectedUrl;

          _.extend(relatedObject, {
            type: relatedObjectType,
            child_type: oldRelatedObjectType,
            child_id: 54321,
          });
          viewModel.openObject(relatedObject);
          expectedUrl = buildUrl(
            rootCollectionType,
            relatedObject.child_id
          );

          expect(getParam(window.open, ARGS.FIRST)).toBe(expectedUrl);
        });
    });
  });

  describe('unmap() method', ()=> {
    beforeEach(function () {
      spyOn($.prototype, 'trigger');
      spyOn(CurrentPageUtils, 'getPageInstance');
      spyOn(CurrentPageUtils, 'navigate');
    });

    it('should change "isLoading" flag in case of success',
      async function (done) {
        spyOn(CMS.Models.Relationship, 'findRelationship')
          .and.returnValue(Promise.resolve());
        viewModel.attr('isLoading', true);
        await viewModel.unmap();
        expect(viewModel.attr('isLoading')).toBe(false);
        done();
      });

    it('should change "isLoading" flag in case of error',
      async function (done) {
        spyOn(CMS.Models.Relationship, 'findRelationship')
          .and.returnValue(Promise.reject());
        viewModel.attr('isLoading', true);

        await viewModel.unmap();
        expect(viewModel.attr('isLoading')).toBe(false);
        done();
      });

    it('should refresh issue page if page instance is issue',
      async function (done) {
        spyOn(CMS.Models.Relationship, 'findRelationship')
          .and.returnValue(Promise.resolve({
            unmap: () => Promise.resolve(),
          }));
        viewModel.attr('issueInstance.viewLink', 'temp url');
        CurrentPageUtils.getPageInstance.and.returnValue(viewModel.attr('issueInstance'));
        await viewModel.unmap();
        expect(CurrentPageUtils.navigate).toHaveBeenCalledWith(
          viewModel.attr('issueInstance.viewLink')
        );
        done();
      });

    it('should change open modal state to false if page instance is not issue',
      async function (done) {
        await viewModel.unmap();
        expect(viewModel.attr('modalState.open')).toBe(false);
        done();
      });

    it('should unmap issue correctly', async function (done) {
      const relationship = jasmine.createSpyObj(['unmap']);
      spyOn(CMS.Models.Relationship, 'findRelationship')
        .and.returnValue(Promise.resolve(relationship));
      await viewModel.unmap();
      expect(relationship.unmap).toHaveBeenCalledWith(true);
      done();
    });

    it('should handle server errors correctly', async function (done) {
      spyOn(CMS.Models.Relationship, 'findRelationship')
        .and.returnValue(Promise.resolve({
          unmap: () => Promise.reject(),
        }));
      await viewModel.unmap();
      expect($.prototype.trigger).toHaveBeenCalledWith('ajax:flash', {
        error: 'There was a problem with unmapping.',
      });
      done();
    });
  });

  describe('showNoRelationhipError() method', ()=> {
    const issueTitle = 'TEST_ISSUE_TITLE';
    const targetType = 'TEST_TARGET_TYPE';
    const targetTitle = 'TEST_TARGET_TITLE';

    beforeEach(()=> {
      viewModel.attr('issueInstance', {
        title: issueTitle,
      });
      viewModel.attr('target', {
        title: targetTitle,
        'class': {
          title_singular: targetType,
        },
      });
      spyOn(GGRC.Errors, 'notifier');
    });

    it('shows correct message', ()=> {
      viewModel.showNoRelationhipError();

      expect(GGRC.Errors.notifier).toHaveBeenCalledWith('error',
        `Unmapping cannot be performed.
        Please unmap Issue (${issueTitle})
        from ${targetType} version (${targetTitle}),
        then mapping with original object will be automatically reverted.`);
    });
  });

  describe('"click" event', ()=> {
    let handler;
    let event;
    beforeEach(()=> {
      handler = events.click.bind({viewModel: viewModel});
      event = jasmine.createSpyObj(['preventDefault']);
      spyOn(viewModel, 'processRelatedSnapshots');
      spyOn(viewModel, 'showNoRelationhipError');
      spyOn(viewModel, 'dispatch');
    });

    it('prevents default action of the event', async function (done) {
      spyOn(CMS.Models.Relationship, 'findRelationship')
        .and.returnValue(Promise.resolve({
          unmap: () => Promise.resolve(),
        }));
      await handler(null, event);
      expect(event.preventDefault).toHaveBeenCalled();
      done();
    });

    it('shows error if there is no relationship', async function (done) {
      spyOn(CMS.Models.Relationship, 'findRelationship')
        .and.returnValue(Promise.resolve(false));
      await handler(null, event);
      expect(viewModel.showNoRelationhipError).toHaveBeenCalled();
      done();
    });

    describe('when there is relationship', () => {
      beforeEach(function () {
        const rel = new can.Map();
        viewModel.attr({
          target: {related_sources: [{id: 1}]},
          issueInstance: {related_sources: [{id: 1}]},
        });
        spyOn(CMS.Models.Relationship, 'findRelationship')
          .and.returnValue(Promise.resolve(rel));
      });

      it(`calls processRelatedSnapshots() if target is assessment and
      not allowed to unmap issue from audit`, async function (done) {
          viewModel.attr('target.type', 'Assessment');
          viewModel.attr('issueInstance.allow_unmap_from_audit', false);
          await handler(null, event);
          expect(viewModel.processRelatedSnapshots).toHaveBeenCalled();
          expect(viewModel.dispatch).not.toHaveBeenCalled();
          done();
        });

      it('dispatches "unmapIssue" event if target', async function (done) {
        viewModel.attr('relationship', {test: 'true'});
        viewModel.attr('target.type', 'Control');
        viewModel.attr('issueInstance.allow_unmap_from_audit', true);
        await handler(null, event);
        expect(viewModel.processRelatedSnapshots).not.toHaveBeenCalled();
        expect(viewModel.dispatch).toHaveBeenCalledWith('unmapIssue');
        done();
      });
    });
  });

  describe('"{viewModel.paging} current" event', ()=> {
    let handler;
    beforeEach(()=> {
      handler = events['{viewModel.paging} current']
        .bind({viewModel: viewModel});
    });

    it('call loadRelatedObjects() method', ()=> {
      spyOn(viewModel, 'loadRelatedObjects');

      handler();

      expect(viewModel.loadRelatedObjects).toHaveBeenCalled();
    });
  });

  describe('"{viewModel.paging} pageSize" event', ()=> {
    let handler;
    beforeEach(()=> {
      handler = events['{viewModel.paging} pageSize']
        .bind({viewModel: viewModel});
    });

    it('call loadRelatedObjects() method', ()=> {
      spyOn(viewModel, 'loadRelatedObjects');

      handler();

      expect(viewModel.loadRelatedObjects).toHaveBeenCalled();
    });
  });
});
