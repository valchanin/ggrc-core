/*
  Copyright (C) 2018 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Component from '../import';
import * as Utils from '../import-export-utils';
import {gapiClient} from '../../../plugins/ggrc-gapi-client';

describe('GGRC.Components.csvImportWidget', function () {
  'use strict';

  let method;  // the method under test
  let fakeScope;

  beforeEach(function () {
    fakeScope = new can.Map({});
  });

  describe('viewModel.states() method', function () {
    beforeEach(function () {
      method = Component.prototype.viewModel.states.bind(fakeScope);
    });

    describe('the returned "import" state config\'s isDisabled() method',
      function () {
        let isDisabled;  // the method under test

        /**
         * A factory function for dummy import block info objects.
         *
         * @param {String} objectType - the name of the block, usually the object
         *   type that is represented by it, e.g. "Assessment"
         * @param {Object} rowCounts - the object containing the counts for
         *   different groups of of rows
         *   @param {Number} [rowCounts.totalRows=0] - the number of all rows
         *     in the block, must equal (created + updated + deleted + ignored)
         *   @param {Number} [rowCounts.created=0] - total rows to create
         *   @param {Number} [rowCounts.updated=0] - total rows to update
         *   @param {Number} [rowCounts.deleted=0] - total rows to delete
         *   @param {Number} [rowCounts.ignored=0] - total rows to ignore
         * @param {Boolean} hasErrors - if true then add non empty array "block_errors"
         *    to block, if false then add empty array
         *
         * @return {can.Map} - a new dummy import block info instance
         */
        function makeImportBlock(objectType, rowCounts, hasErrors) {
          let COUNT_FIELD_NAMES = ['created', 'updated', 'deleted', 'ignored'];
          let COUNT_ERR = 'Invalid row counts, the sum of created, updated, ' +
              'deleted, and ignored must equal the total row count.';

          let blockOptions = {
            name: objectType,
            rows: rowCounts.totalRows || 0,
            block_errors: hasErrors ? new can.List({}) : new can.List(),
          };
          let combinedCount = 0;

          COUNT_FIELD_NAMES.forEach(function (field) {
            blockOptions[field] = rowCounts[field] || 0;
            combinedCount += blockOptions[field];
          });

          if (combinedCount !== blockOptions.rows) {
            throw new Error(COUNT_ERR);
          }

          return new can.Map(blockOptions);
        }

        beforeEach(function () {
          let importStateConfig;
          fakeScope.attr('state', 'import');
          importStateConfig = method();
          isDisabled = importStateConfig.isDisabled;
        });

        it('returns true when import blocks list not available', function () {
          let result;
          fakeScope.attr('import', null);
          result = isDisabled();
          expect(result).toBe(true);
        });

        it('returns true when import blocks list is empty', function () {
          let result;
          fakeScope.attr('import', []);
          result = isDisabled();
          expect(result).toBe(true);
        });

        it('returns true if all blocks in the list empty', function () {
          let result;
          let importBlocks = [
            makeImportBlock('Assessment', {totalRows: 0}),
            makeImportBlock('Market', {totalRows: 0}),
          ];
          fakeScope.attr('import', importBlocks);

          result = isDisabled();

          expect(result).toBe(true);
        });

        it('returns true if blocks has errors', function () {
          let result;
          let importBlocks = [
            makeImportBlock('Assessment', {totalRows: 4, ignored: 4}, true),
            makeImportBlock('Market', {totalRows: 0, ignored: 0}),
            makeImportBlock(
              'Contract', {totalRows: 3, created: 1, ignored: 2}),
          ];
          fakeScope.attr('import', importBlocks);

          result = isDisabled();

          expect(result).toBe(true);
        });

        it('returns true for non-empty block that have all rows ignored',
          function () {
            let result;
            let importBlocks = [
              makeImportBlock('Assessment', {totalRows: 4, ignored: 4}),
            ];
            fakeScope.attr('import', importBlocks);

            result = isDisabled();

            expect(result).toBe(true);
          }
        );

        it('returns false if there are non-empty blocks containing ' +
          'non-ignored lines',
          function () {
            let result;
            let importBlocks = [
              makeImportBlock('Assessment', {totalRows: 4, ignored: 4}),
              makeImportBlock('Market', {totalRows: 0, ignored: 0}),
              makeImportBlock(
                'Contract', {totalRows: 3, created: 1, ignored: 2}),
            ];
            fakeScope.attr('import', importBlocks);

            result = isDisabled();

            expect(result).toBe(false);
          }
        );
      }
    );
  });

  describe('requestImport() method', function () {
    let importDfd;

    beforeEach(function () {
      method = Component.prototype.viewModel.requestImport.bind(fakeScope);
      importDfd = new can.Deferred();
      spyOn(Utils, 'importRequest').and.returnValue(importDfd);
      fakeScope.prepareDataForCheck = jasmine.createSpy();
      fakeScope.beforeProcess = jasmine.createSpy();
    });

    it('sets "analyzing" value to "state" attribute', function () {
      fakeScope.attr('state', null);
      method({});
      expect(fakeScope.attr('state')).toEqual('analyzing');
    });

    it('sets true to "isLoading" attribute', function () {
      fakeScope.attr('isLoading', null);
      method({});
      expect(fakeScope.attr('isLoading')).toEqual(true);
    });

    it('sets file id to "fileId" attribute', function () {
      fakeScope.attr('fileId', null);
      method({id: '12343'});
      expect(fakeScope.attr('fileId')).toEqual('12343');
    });

    it('sets file name to "fileName" attribute', function () {
      fakeScope.attr('fileName', null);
      method({name: 'import_objects'});
      expect(fakeScope.attr('fileName')).toEqual('import_objects');
    });

    it('calls import_request method from utils with data containing file id' +
    ' to check data for import', function () {
      method({id: '12343'});
      expect(Utils.importRequest).toHaveBeenCalledWith({
        data: {id: '12343'},
      }, true);
    });

    describe('after getting response', function () {
      let checkObject;

      beforeEach(function () {
        fakeScope.element = 'element';
        checkObject = {
          check: 'check',
          data: 'data',
        };
        fakeScope.prepareDataForCheck.and.returnValue(checkObject);
      });

      describe('in case of success', function () {
        it('calls prepareDataForCheck method', function (done) {
          let mockData = {data: 'data'};
          importDfd.resolve(mockData);
          method({});
          expect(fakeScope.prepareDataForCheck).toHaveBeenCalledWith(mockData);
          done();
        });

        it('calls beforeProcess method', function (done) {
          importDfd.resolve();
          method({});
          expect(fakeScope.beforeProcess).toHaveBeenCalledWith(
            checkObject.check, checkObject.data, fakeScope.element);
          done();
        });

        it('sets false to isLoading attribute', function (done) {
          importDfd.resolve();
          method({});
          expect(fakeScope.attr('isLoading')).toBe(false);
          done();
        });
      });

      describe('in case of fail', function () {
        let failData;

        beforeEach(function () {
          failData = {
            responseJSON: {message: 'message'},
          };
          spyOn(GGRC.Errors, 'notifier');
        });

        it('sets "select" value to state attribute', function (done) {
          importDfd.reject(failData);
          method({});
          expect(fakeScope.attr('state')).toEqual('select');
          done();
        });

        it('calls GGRC errors notifier with error message', function (done) {
          importDfd.reject(failData);
          method({});
          expect(GGRC.Errors.notifier).toHaveBeenCalledWith('error',
            failData.responseJSON.message);
          done();
        });

        it('sets false to isLoading attribute', function (done) {
          importDfd.reject(failData);
          method({});
          expect(fakeScope.attr('isLoading')).toBe(false);
          done();
        });
      });
    });
  });

  describe('"#import_btn.state-select click" handler', function () {
    let authDfd;

    beforeEach(function () {
      method = Component.prototype.viewModel.selectFile;
      authDfd = new can.Deferred();
      spyOn(gapiClient, 'authorizeGapi').and.returnValue(authDfd);
      spyOn(gapi.auth, 'getToken').and.returnValue('mockToken');
      spyOn(gapi, 'load');
    });

    it('calls gdrive authorization', function () {
      method();
      expect(gapiClient.authorizeGapi)
        .toHaveBeenCalledWith(['https://www.googleapis.com/auth/drive']);
    });

    it('loads gdrive picker after authorization', function () {
      authDfd.resolve();

      method();
      expect(gapi.load).toHaveBeenCalledWith('picker',
        {callback: jasmine.any(Function)});
    });
  });
});
