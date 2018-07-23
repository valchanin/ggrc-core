/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import Component from '../related-revisions';
import {getComponentVM} from '../../../../../js_specs/spec_helpers';
import Revision from '../../../../models/service-models/revision';

describe('RelatedRevisions component', () => {
  let viewModel;

  beforeEach(() => {
    viewModel = getComponentVM(Component);
  });

  describe('paging value getter', () => {
    it('returns Pagination object with correct pagination', () => {
      let pagination = viewModel.attr('paging');

      expect(pagination.attr('pageSizeSelect').serialize())
        .toEqual([5, 10, 15]);
    });
  });

  describe('setVisibleRevisions() method', () => {
    it(`sets visibleRevisions according to paging.limits
      and recalculates pages`, () => {
        let revisions = new Array(10);
        revisions.fill(1);
        viewModel.attr('visibleRevisions', null);
        viewModel.attr('revisions', revisions);
        viewModel.attr('paging.limits', [0, 5]);
        viewModel.attr('paging.total', 0);

        viewModel.setVisibleRevisions();

        expect(viewModel.attr('visibleRevisions').length).toBe(5);
        expect(viewModel.attr('paging.total')).toBe(10);
      });
  });

  describe('loadRevisions() method', () => {
    let requestDeferred;

    beforeEach(() => {
      viewModel.attr('instance', {id: 1, type: 'Risk'});
      requestDeferred = can.Deferred();
      spyOn(viewModel, 'buildRevisionRequest').and.returnValue(requestDeferred);
      spyOn(viewModel, 'setVisibleRevisions');
    });

    it('should not load items if instance is undefined', () => {
      viewModel.attr('instance', undefined);
      viewModel.loadRevisions();
      expect(viewModel.buildRevisionRequest).not.toHaveBeenCalled();
      expect(viewModel.attr('loading')).toBeFalsy();
    });

    it('turns on loading flag', () => {
      viewModel.attr('loading', false);
      viewModel.loadRevisions();

      expect(viewModel.attr('loading')).toBeTruthy();
    });

    it('builds revision request with "resource" param', () => {
      viewModel.loadRevisions();
      expect(viewModel.buildRevisionRequest).toHaveBeenCalledWith('resource');
    });

    it('turns off loading flag if all is OK', (done) => {
      viewModel.loadRevisions();
      expect(viewModel.attr('loading')).toBeTruthy();

      requestDeferred.then(() => {
        expect(viewModel.attr('loading')).toBeFalsy();
        done();
      });
      requestDeferred.resolve();
    });

    it('sets lastRevision correctly', (done) => {
      viewModel.attr('lastRevision', null);
      viewModel.loadRevisions();

      requestDeferred.then(() => {
        expect(viewModel.attr('lastRevision')).toBe('lastRevision');
        done();
      });

      requestDeferred.resolve(['lastRevision', 'revision2', 'revision1']);
    });

    it('sets paging.total correctly', (done) => {
      viewModel.attr('paging.total', null);
      viewModel.loadRevisions();

      requestDeferred.then(() => {
        expect(viewModel.attr('paging.total')).toBe(2);
        done();
      });

      requestDeferred.resolve(['lastRevision', 'revision2', 'revision1']);
    });

    it('sets revisions correctly', (done) => {
      viewModel.attr('revisions', null);
      viewModel.loadRevisions();

      requestDeferred.then(() => {
        const revisions = viewModel.attr('revisions').attr();
        expect(revisions.length).toBe(2);
        expect(revisions[0]).toEqual('revision2');
        expect(revisions[1]).toEqual('revision1');
        done();
      });

      requestDeferred.resolve(['lastRevision', 'revision2', 'revision1']);
    });

    it('calls setVisibleRevisions method ' +
      'if revisions are available', (done) => {
      viewModel.loadRevisions();

      requestDeferred.then(() => {
        expect(viewModel.setVisibleRevisions).toHaveBeenCalled();
        done();
      });

      requestDeferred.resolve(['lastRevision', 'revision2', 'revision1']);
    });

    it('do not call setVisibleRevisions() if revisions are not available',
      (done) => {
        viewModel.loadRevisions();

        requestDeferred.then(() => {
          expect(viewModel.setVisibleRevisions).not.toHaveBeenCalled();
          done();
        });

        requestDeferred.resolve();
      }
    );
  });

  describe('buildRevisionRequest() method', () => {
    it('calls Revision.findAll() method with correct query', () => {
      const query = {
        __sort: '-updated_at',
        resource_type: 'type',
        resource_id: 'id',
      };
      spyOn(Revision, 'findAll');
      viewModel.attr('instance', {
        type: 'type',
        id: 'id',
      });

      viewModel.buildRevisionRequest('resource');

      expect(Revision.findAll.calls.mostRecent().args)
        .toEqual([query]);
    });
  });
});
