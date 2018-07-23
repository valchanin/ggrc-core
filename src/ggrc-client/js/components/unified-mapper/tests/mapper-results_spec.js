/*
  Copyright (C) 2018 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import * as TreeViewUtils from '../../../plugins/utils/tree-view-utils';
import * as SnapshotUtils from '../../../plugins/utils/snapshot-utils';
import * as AdvancedSearch from '../../../plugins/utils/advanced-search-utils';
import * as QueryAPI from '../../../plugins/utils/query-api-utils';
import Pagination from '../../base-objects/pagination';
import {getComponentVM} from '../../../../js_specs/spec_helpers';
import Component from '../mapper-results';
import DisplayPrefs from '../../../models/local-storage/display-prefs';

describe('mapper-results component', function () {
  'use strict';

  let viewModel;

  beforeEach(function () {
    let init = Component.prototype.viewModel.init;
    Component.prototype.viewModel.init = undefined;
    viewModel = getComponentVM(Component);
    viewModel.attr('mapper', {
      type: 'Control',
    });
    viewModel.attr('submitCbs', $.Callbacks());
    viewModel.attr('paging',
      new Pagination({pageSizeSelect: [5, 10, 15]}));
    Component.prototype.viewModel.init = init;
    viewModel.init = init;
  });

  describe('init() method', function () {
    let displayPrefs = 'displayPrefs';

    beforeEach(function () {
      spyOn(DisplayPrefs, 'getSingleton')
        .and.returnValue(can.Deferred().resolve(displayPrefs));
    });

    it('updates viewModel.displayPrefs', function () {
      viewModel.attr('displayPrefs', 'oldDisplayPrefs');
      viewModel.init();
      expect(viewModel.attr('displayPrefs'))
        .toEqual(displayPrefs);
    });
  });

  describe('destroy() method', function () {
    beforeEach(function () {
      spyOn(viewModel.attr('submitCbs'), 'remove');
    });

    it('removes function from viewModel.submitCbs', function () {
      viewModel.destroy();
      expect(viewModel.attr('submitCbs').remove)
        .toHaveBeenCalledWith(jasmine.any(Function));
    });
  });

  describe('setItems() method', function () {
    let items;

    beforeEach(function () {
      items = [
        {data: 'mockData'},
      ];
      spyOn(viewModel, 'load')
        .and.returnValue($.Deferred().resolve(items));
      spyOn(viewModel, 'setColumnsConfiguration');
      spyOn(viewModel, 'setRelatedAssessments');
      viewModel.attr({});
    });

    it('sets loaded items to viewModel.items', function () {
      viewModel.attr('items', []);
      viewModel.setItems();
      expect(viewModel.attr('items').length).toEqual(1);
      expect(viewModel.attr('items')[0])
        .toEqual(jasmine.objectContaining({
          data: 'mockData',
        }));
    });

    it('sets data of loaded items to viewModel.entries', function () {
      viewModel.attr('entries', []);
      viewModel.setItems();
      expect(viewModel.attr('entries').length).toEqual(1);
      expect(viewModel.attr('entries')[0])
        .toEqual('mockData');
    });

    it('calls setColumnsConfiguration and setRelatedAssessments',
      function () {
        viewModel.setItems();
        expect(viewModel.setColumnsConfiguration).toHaveBeenCalled();
        expect(viewModel.setRelatedAssessments).toHaveBeenCalled();
      });

    it('sets viewModel.isBeforeLoad to false', function () {
      viewModel.attr('isBeforeLoad', true);
      viewModel.setItems();
      expect(viewModel.attr('isBeforeLoad')).toEqual(false);
    });
  });

  describe('setColumnsConfiguration() method', function () {
    let mockColumns;

    beforeEach(function () {
      viewModel.attr('columns', {});
      mockColumns = {
        available: 'mock1',
        selected: 'mock2',
        disableConfiguration: 'mock3',
      };
      spyOn(TreeViewUtils, 'getColumnsForModel')
        .and.returnValue(mockColumns);
      spyOn(viewModel, 'getDisplayModel')
        .and.returnValue({
          model_singular: '',
        });
    });

    it('updates available columns', function () {
      viewModel.attr('columns.available', 'available');
      viewModel.setColumnsConfiguration();
      expect(viewModel.attr('columns.available')).toEqual('mock1');
    });

    it('updates selected columns', function () {
      viewModel.attr('columns.selected', 'selected');
      viewModel.setColumnsConfiguration();
      expect(viewModel.attr('columns.selected')).toEqual('mock2');
    });

    it('updates disableColumnsConfiguration', function () {
      viewModel.attr('disableColumnsConfiguration', 'configuration');
      viewModel.setColumnsConfiguration();
      expect(viewModel.attr('disableColumnsConfiguration')).toEqual('mock3');
    });
  });

  describe('setSortingConfiguration() method', () => {
    beforeEach(function () {
      viewModel.attr('columns', {});
      spyOn(TreeViewUtils, 'getSortingForModel')
        .and.returnValue(
          {
            key: 'key',
            direction: 'direction',
          });
      spyOn(viewModel, 'getDisplayModel')
        .and.returnValue({
          model_singular: '',
        });
    });

    it('updates sort key', () => {
      viewModel.attr('sort.key', null);
      viewModel.setSortingConfiguration();

      expect(viewModel.attr('sort.key')).toEqual('key');
    });

    it('updates sort direction', () => {
      viewModel.attr('sort.direction', null);
      viewModel.setSortingConfiguration();

      expect(viewModel.attr('sort.direction')).toEqual('direction');
    });
  });

  describe('setRelatedAssessments() method', function () {
    beforeEach(function () {
      viewModel.attr({});
      viewModel.attr('relatedAssessments', {});
      spyOn(viewModel, 'getDisplayModel')
        .and.returnValue({
          tree_view_options: {
            show_related_assessments: true,
          },
        });
    });

    it('sets relatedAssessments.show to false if it is use-snapshots case',
      function () {
        viewModel.attr('useSnapshots', true);
        viewModel.setRelatedAssessments();
        expect(viewModel.attr('relatedAssessments.show')).toEqual(false);
      });

    it('updates relatedAssessments.show if it is not use-snapshots case',
      function () {
        viewModel.attr('useSnapshots', false);
        viewModel.setRelatedAssessments();
        expect(viewModel.attr('relatedAssessments.show')).toEqual(true);
      });
  });

  describe('resetSearchParams() method', function () {
    const DEFAULT_PAGE_SIZE = 10;

    beforeEach(function () {
      viewModel.attr('paging', {});
      viewModel.attr('sort', {});
      spyOn(viewModel, 'getDisplayModel')
        .and.returnValue({
          model_singular: '',
        });
    });

    it('sets 1 to current of paging', function () {
      viewModel.attr('paging.current', 9);
      viewModel.resetSearchParams();
      expect(viewModel.attr('paging.current')).toEqual(1);
    });

    it('sets default size to pageSize of paging', function () {
      viewModel.attr('paging.pageSize', 11);
      viewModel.resetSearchParams();
      expect(viewModel.attr('paging.pageSize')).toEqual(DEFAULT_PAGE_SIZE);
    });

    it('sets default sorting', () => {
      spyOn(viewModel, 'setSortingConfiguration');

      viewModel.resetSearchParams();
      expect(viewModel.setSortingConfiguration).toHaveBeenCalled();
    });
  });

  describe('onSearch() method', function () {
    beforeEach(function () {
      spyOn(viewModel, 'resetSearchParams');
    });

    it('calls resetSearchParams() if resetParams defined', function () {
      viewModel.onSearch({});
      expect(viewModel.resetSearchParams).toHaveBeenCalled();
    });

    it('sets viewModel.refreshItems to true', function () {
      viewModel.attr('refreshItems', false);
      viewModel.onSearch();
      expect(viewModel.attr('refreshItems')).toEqual(true);
    });
  });

  describe('prepareRelevantQuery() method', function () {
    let relevantList = [{
      id: 0,
      type: 'test0',
    }, {
      id: 1,
      type: 'test1',
    }];
    let expectedResult = [{
      id: 0,
      type: 'test0',
      operation: 'relevant',
    }, {
      id: 1,
      type: 'test1',
      operation: 'relevant',
    }];
    beforeEach(function () {
      viewModel.attr('relevantTo', relevantList);
    });
    it('returns relevant filters', function () {
      let result = viewModel.prepareRelevantQuery();
      expect(result.attr()).toEqual(expectedResult);
    });
  });

  describe('prepareRelatedQuery() method', function () {
    it('returns null if viewModel.baseInstance is undefined', function () {
      let result = viewModel.prepareRelatedQuery();
      expect(result).toEqual(null);
    });

    it('returns query', function () {
      let result;
      viewModel.attr('baseInstance', {
        type: 'mockType',
        id: 123,
      });
      spyOn(QueryAPI, 'buildRelevantIdsQuery')
        .and.returnValue('mockQuery');
      result = viewModel.prepareRelatedQuery();
      expect(result).toEqual('mockQuery');
    });
  });

  describe('loadAllItems() method', function () {
    beforeEach(function () {
      spyOn(viewModel, 'loadAllItemsIds')
        .and.returnValue('mockItems');
    });

    it('updates viewModel.allItems', function () {
      viewModel.loadAllItems();
      expect(viewModel.attr('allItems')).toEqual('mockItems');
    });
  });

  describe('getQuery() method', function () {
    let mockPaging = {
      current: 'mock1',
      pageSize: 'mock2',
    };
    let mockSort = {
      key: 'mock3',
      direction: 'mock4',
    };
    let mockFilterItems = new can.List(['filterItem']);
    let mockMappingItems = new can.List(['mappingItem']);
    let mockStatusItem = new can.Map({
      value: {
        items: ['statusItem'],
      },
    });

    beforeEach(function () {
      viewModel.attr('type', 'mockName');
      viewModel.attr('paging', mockPaging);
      viewModel.attr('sort', mockSort);
      viewModel.attr('filterItems', mockFilterItems);
      viewModel.attr('mappingItems', mockMappingItems);
      viewModel.attr('statusItem', mockStatusItem);

      spyOn(viewModel, 'prepareRelevantQuery')
        .and.returnValue('relevant');
      spyOn(viewModel, 'prepareRelatedQuery')
        .and.returnValue({mockData: 'related'});

      spyOn(QueryAPI, 'buildParam')
        .and.returnValue({});
      spyOn(AdvancedSearch, 'buildFilter');
      spyOn(GGRC.query_parser, 'parse');
      spyOn(GGRC.query_parser, 'join_queries');
    });

    it('builds advanced filters', function () {
      viewModel.getQuery('values', true);
      expect(AdvancedSearch.buildFilter.calls.argsFor(0)[0])
        .toEqual(mockFilterItems.attr());
    });

    it('builds advanced mappings', function () {
      viewModel.getQuery('values', true);
      expect(AdvancedSearch.buildFilter.calls.argsFor(1)[0])
        .toEqual(mockMappingItems.attr());
    });

    it('builds advanced status', function () {
      viewModel.getQuery('values', true);
      expect(AdvancedSearch.buildFilter.calls.argsFor(2)[0][0])
        .toEqual(mockStatusItem.attr());
    });

    it('does not build advanced status if sttatus items are not provided',
      function () {
        viewModel.attr('statusItem', {});
        viewModel.getQuery('values', true);
        expect(AdvancedSearch.buildFilter.calls.count()).toBe(2);
      });

    it('adds paging to query if addPaging is true', function () {
      viewModel.removeAttr('sort.key');
      viewModel.getQuery('values', true);
      expect(QueryAPI.buildParam.calls.argsFor(0)[1])
        .toEqual({
          current: 'mock1',
          pageSize: 'mock2',
        });
    });

    it('adds paging with sort to query if sort.key is defined', function () {
      viewModel.getQuery('values', true);
      expect(QueryAPI.buildParam.calls.argsFor(0)[1].sort[0].key)
        .toBe('mock3');
      expect(QueryAPI.buildParam.calls.argsFor(0)[1].sort[0].direction)
        .toBe('mock4');
    });

    it('adds defaultSort to paging if no sort', function () {
      viewModel.removeAttr('sort');
      viewModel.attr('defaultSort', [{key: 'mock5', direction: 'mock6'}]);
      viewModel.getQuery('values', true);

      expect(QueryAPI.buildParam.calls.argsFor(0)[1].sort[0].key).toBe('mock5');
    });

    it('sets "read" to permissions if model is person', function () {
      let result;
      viewModel.attr('type', 'Person');
      viewModel.attr('useSnapshots', false);
      result = viewModel.getQuery('Person', true);
      expect(result.request[0]).toEqual(jasmine.objectContaining({
        permissions: 'read',
        type: 'Person',
      }));
    });

    it('transform query to snapshot if useSnapshots is true', function () {
      let result;
      viewModel.attr('useSnapshots', true);
      spyOn(SnapshotUtils, 'transformQuery')
        .and.returnValue({mockData: 'snapshot'});
      result = viewModel.getQuery();
      expect(result.request[0]).toEqual(jasmine.objectContaining({
        mockData: 'snapshot',
        permissions: 'update',
        type: 'values',
      }));
      expect(result.request[1]).toEqual(jasmine.objectContaining({
        mockData: 'snapshot',
      }));
    });

    it('set "read" permission if "searchOnly"', function () {
      let result;
      viewModel.attr('searchOnly', true);
      result = viewModel.getQuery();
      expect(result.request[0]).toEqual(jasmine.objectContaining({
        permissions: 'read',
      }));
    });

    it('prepare request for unlocked items for Audits', function () {
      viewModel.attr('type', 'Audit');
      spyOn(viewModel, 'prepareUnlockedFilter').and.returnValue('unlocked');
      viewModel.getQuery();

      expect(GGRC.query_parser.join_queries.calls.argsFor(2)[1])
        .toBe('unlocked');
    });

    it('prepare request for owned items if flag was set', function () {
      let mockUser = {
        id: -1,
      };
      let oldUser = GGRC.current_user;
      GGRC.current_user = mockUser;
      spyOn(GGRC.current_user, 'id').and.returnValue(-1);
      viewModel.attr('applyOwnedFilter', true);

      viewModel.getQuery();

      expect(GGRC.query_parser.join_queries.calls.argsFor(2)[1]).toEqual({
        expression: {
          object_name: 'Person',
          op: {
            name: 'owned',
          },
          ids: [mockUser.id],
        },
      });

      GGRC.current_user = oldUser;
    });
  });

  describe('getModelKey() method', function () {
    it('returns "Snapshot" if useSnapshots is true', function () {
      let result;
      viewModel.attr('useSnapshots', true);
      result = viewModel.getModelKey();
      expect(result).toEqual('Snapshot');
    });

    it('returns type of model if useSnapshots is false', function () {
      let result;
      viewModel.attr('type', 'Mock');
      viewModel.attr('useSnapshots', false);
      result = viewModel.getModelKey();
      expect(result).toEqual('Mock');
    });
  });

  describe('getModel() method', function () {
    it('returns model', function () {
      let result;
      spyOn(viewModel, 'getModelKey')
        .and.returnValue('Program');
      result = viewModel.getModel();
      expect(result).toEqual(CMS.Models.Program);
    });
  });

  describe('getDisplayModel() method', function () {
    it('returns displayModel', function () {
      let result;
      viewModel.attr('type', 'Program');
      result = viewModel.getDisplayModel();
      expect(result).toEqual(CMS.Models.Program);
    });
  });

  describe('setDisabledItems() method', function () {
    let allItems = [{
      data: {
        id: 123,
      },
    }, {
      data: {
        id: 124,
      },
    }];
    let relatedIds = [123];
    let expectedResult = [{
      data: {
        id: 123,
      },
      isDisabled: true,
    }, {
      data: {
        id: 124,
      },
      isDisabled: false,
    }];

    it('does nothing if viewModel.searchOnly() is true', function () {
      viewModel.attr('searchOnly', true);
      viewModel.setDisabledItems(allItems, relatedIds);
      expect(allItems).toEqual(allItems);
    });

    it('does nothing if it is case of object generation',
      function () {
        viewModel.attr({
          objectGenerator: true,
        });
        viewModel.setDisabledItems(allItems, relatedIds);
        expect(allItems).toEqual(allItems);
      });

    it('updates disabled items', function () {
      viewModel.attr('searchOnly', false);
      viewModel.setDisabledItems(allItems, relatedIds);
      expect(allItems).toEqual(expectedResult);
    });
  });

  describe('setSelectedItems() method', function () {
    let allItems = [{
      id: 123,
    }, {
      id: 124,
    }];
    let expectedResult = [{
      id: 123,
      isSelected: true,
      markedSelected: true,
    }, {
      id: 124,
      isSelected: false,
    }];

    it('updates selected items', function () {
      viewModel.attr('selected', [{id: 123}]);
      viewModel.setSelectedItems(allItems);
      expect(allItems).toEqual(expectedResult);
    });

    it('uses prevSelected if prevSelected.length > 0', function () {
      viewModel.attr('prevSelected', [{id: 123}]);
      viewModel.setSelectedItems(allItems);
      expect(allItems).toEqual(expectedResult);
      expect(viewModel.attr('prevSelected').length).toEqual(0);
    });
  });

  describe('transformValue() method', function () {
    let Model;

    beforeEach(function () {
      Model = {
        model: jasmine.createSpy().and.returnValue('transformedValue'),
      };
      spyOn(viewModel, 'getDisplayModel')
        .and.returnValue(Model);
    });

    it('returns transformed value', function () {
      let result;
      let value = 'mockValue';
      viewModel.attr('useSnapshots', false);
      result = viewModel.transformValue(value);
      expect(result).toEqual('transformedValue');
    });

    it('returns snapshot-transformed value if it is use-snapshots case',
      function () {
        let result;
        let value = {
          revision: {
            content: 'mockContent',
          },
        };
        let expectedResult = {
          snapshotObject: 'snapshot',
          revision: {
            content: 'transformedValue',
          },
        };
        spyOn(SnapshotUtils, 'toObject')
          .and.returnValue('snapshot');
        viewModel.attr('useSnapshots', true);
        result = viewModel.transformValue(value);
        expect(result).toEqual(expectedResult);
      });
  });

  describe('load() method', function () {
    let data = {
      program: {
        values: [{
          id: 123,
          type: 'mockType',
        }],
        total: 4,
      },
    };
    let expectedResult = [{
      id: 123,
      type: 'mockType',
      data: 'transformedValue',
    }];
    let relatedData;
    let dfdRequest;
    let resultDfd;

    beforeEach(function () {
      spyOn(viewModel, 'getModelKey')
        .and.returnValue('program');
      spyOn(viewModel, 'getQuery')
        .and.returnValue({
          queryIndex: 0,
          relatedQueryIndex: 1,
          request: [],
        });
      spyOn(viewModel, 'transformValue')
        .and.returnValue('transformedValue');
      spyOn(viewModel, 'setSelectedItems');
      spyOn(viewModel, 'setDisabledItems');
      dfdRequest = $.Deferred();
      spyOn(QueryAPI, 'batchRequests');
      spyOn(can, 'when')
        .and.returnValue(dfdRequest.promise());
    });

    it('calls viewModel.setSelectedItems()', function () {
      dfdRequest.resolve(data, relatedData);
      viewModel.load();
      expect(viewModel.setSelectedItems)
        .toHaveBeenCalledWith(expectedResult);
    });

    it('calls viewModel.setDisabledItems() if relatedData is defined',
      function () {
        relatedData = {
          program: {
            ids: 'ids',
          },
        };
        dfdRequest.resolve(data, relatedData);
        viewModel.load();
        expect(viewModel.setDisabledItems)
          .toHaveBeenCalledWith(expectedResult, 'ids');
      });

    it('updates paging', function () {
      dfdRequest.resolve(data, relatedData);
      viewModel.load();
      expect(viewModel.attr('paging.total')).toEqual(4);
    });

    it('sets isLoading to false', function () {
      dfdRequest.resolve(data, relatedData);
      viewModel.load();
      expect(viewModel.attr('isLoading')).toEqual(false);
    });

    it('returns promise with array of items', function (done) {
      dfdRequest.resolve(data, relatedData);
      resultDfd = viewModel.load();
      expect(resultDfd.state()).toEqual('resolved');
      resultDfd.then(function (result) {
        expect(result).toEqual(expectedResult);
        done();
      });
    });

    it('returns promise with empty array if fail', function (done) {
      dfdRequest.reject();
      resultDfd = viewModel.load();
      expect(resultDfd.state()).toEqual('resolved');
      resultDfd.then(function (result) {
        expect(result).toEqual([]);
        done();
      });
    });
  });

  describe('loadAllItemsIds() method', function () {
    let data = {
      program: {
        ids: [123],
      },
    };
    let expectedResult = [{
      id: 123,
      type: 'program',
    }];
    let filters = {
      program: {
        ids: [123],
      },
    };
    let resultDfd;
    let dfdRequest;

    beforeEach(function () {
      viewModel.attr({});
      dfdRequest = can.Deferred();
      spyOn(QueryAPI, 'batchRequests');
      spyOn(can, 'when')
        .and.returnValue(dfdRequest.promise());
      spyOn(viewModel, 'getModelKey')
        .and.returnValue('program');
      spyOn(viewModel, 'getQuery')
        .and.returnValue({
          queryIndex: 0,
          relatedQueryIndex: 1,
          request: [],
        });
      spyOn(viewModel, 'transformValue')
        .and.returnValue('transformedValue');
    });

    it('rerturns promise with items', function (done) {
      dfdRequest.resolve(data, filters);
      viewModel.attr('objectGenerator', true);
      resultDfd = viewModel.loadAllItemsIds();
      expect(resultDfd.state()).toEqual('resolved');
      resultDfd.then(function (result) {
        expect(result).toEqual(expectedResult);
        done();
      });
    });

    it('performs extra mapping validation in case Assessment generation',
      function (done) {
        dfdRequest.resolve(data, filters);
        viewModel.attr('objectGenerator', false);
        resultDfd = viewModel.loadAllItemsIds();
        expect(resultDfd.state()).toEqual('resolved');
        resultDfd.then(function (result) {
          expect(result).toEqual([]);
          done();
        });
      });

    it('rerturns promise with empty array if fail',
      function (done) {
        dfdRequest.reject();
        viewModel.attr('objectGenerator', true);
        resultDfd = viewModel.loadAllItemsIds();
        expect(resultDfd.state()).toEqual('resolved');
        resultDfd.then(function (result) {
          expect(result).toEqual([]);
          done();
        });
      });
  });

  describe('setItemsDebounced() method', function () {
    beforeEach(function () {
      spyOn(window, 'clearTimeout');
      spyOn(window, 'setTimeout')
        .and.returnValue(123);
    });

    it('clears timeout of viewModel._setItemsTimeout', function () {
      viewModel.attr('_setItemsTimeout', 321);
      viewModel.setItemsDebounced();
      expect(clearTimeout).toHaveBeenCalledWith(321);
    });

    it('sets timeout in viewModel._setItemsTimeout', function () {
      viewModel.setItemsDebounced();
      expect(viewModel.attr('_setItemsTimeout'))
        .toEqual(123);
    });
  });

  describe('showRelatedAssessments() method', function () {
    beforeEach(function () {
      viewModel.attr('relatedAssessments', {
        state: {},
      });
    });

    it('sets viewModel.relatedAssessments.instance', function () {
      viewModel.attr('relatedAssessments.instance', 1);
      viewModel.showRelatedAssessments({
        instance: 123,
      });
      expect(viewModel.attr('relatedAssessments.instance'))
        .toEqual(123);
    });

    it('sets viewModel.relatedAssessments.state.open to true', function () {
      viewModel.attr('relatedAssessments.state.open', false);
      viewModel.showRelatedAssessments({
        instance: 123,
      });
      expect(viewModel.attr('relatedAssessments.state.open'))
        .toEqual(true);
    });
  });

  describe('events', function () {
    let events;

    beforeEach(function () {
      events = Component.prototype.events;
    });

    describe('"{viewModel} allSelected" event', function () {
      let handler;

      beforeEach(function () {
        spyOn(viewModel, 'loadAllItems');
        handler = events['{viewModel} allSelected'].bind({
          viewModel: viewModel,
        });
      });
      it('calls loadAllItems() if allSelected is truly', function () {
        handler({}, {}, true);
        expect(viewModel.loadAllItems).toHaveBeenCalled();
      });
      it('does not call loadAllItems() if allSelected is falsy', function () {
        handler({}, {}, false);
        expect(viewModel.loadAllItems).not.toHaveBeenCalled();
      });
    });

    describe('"{viewModel} refreshItems" event', function () {
      let handler;

      beforeEach(function () {
        spyOn(viewModel, 'setItemsDebounced');
        handler = events['{viewModel} refreshItems'].bind({
          viewModel: viewModel,
        });
      });
      it('calls setItemsDebounced() if refreshItems is truly', function () {
        handler({}, {}, true);
        expect(viewModel.setItemsDebounced).toHaveBeenCalled();
      });
      it('sets false to viewModel.refreshItems if refreshItems is truly',
        function () {
          handler({}, {}, true);
          expect(viewModel.setItemsDebounced).toHaveBeenCalled();
        });
      it('does not call setItemsDebounced() if refreshItems is falsy',
        function () {
          handler({}, {}, false);
          expect(viewModel.setItemsDebounced).not.toHaveBeenCalled();
        });
    });

    describe('"{viewModel.paging} current" event', function () {
      let handler;

      beforeEach(function () {
        spyOn(viewModel, 'setItemsDebounced');
        handler = events['{viewModel.paging} current'].bind({
          viewModel: viewModel,
        });
      });
      it('calls setItemsDebounced()', function () {
        handler();
        expect(viewModel.setItemsDebounced).toHaveBeenCalled();
      });
    });

    describe('"{viewModel.paging} pageSize" event', function () {
      let handler;

      beforeEach(function () {
        spyOn(viewModel, 'setItemsDebounced');
        handler = events['{viewModel.paging} pageSize'].bind({
          viewModel: viewModel,
        });
      });
      it('calls setItemsDebounced()', function () {
        handler();
        expect(viewModel.setItemsDebounced).toHaveBeenCalled();
      });
    });

    describe('"{viewModel.sort} key" event', function () {
      let handler;

      beforeEach(function () {
        spyOn(viewModel, 'setItemsDebounced');
        handler = events['{viewModel.sort} key'].bind({
          viewModel: viewModel,
        });
      });
      it('calls setItemsDebounced()', function () {
        handler();
        expect(viewModel.setItemsDebounced).toHaveBeenCalled();
      });
    });

    describe('"{viewModel.sort} direction" event', function () {
      let handler;

      beforeEach(function () {
        spyOn(viewModel, 'setItemsDebounced');
        handler = events['{viewModel.sort} direction'].bind({
          viewModel: viewModel,
        });
      });
      it('calls setItemsDebounced()', function () {
        handler();
        expect(viewModel.setItemsDebounced).toHaveBeenCalled();
      });
    });
  });

  describe('buildRelatedData() method', function () {
    let viewModel;

    beforeEach(function () {
      Component.prototype.viewModel.init = undefined;
      viewModel = getComponentVM(Component);
      viewModel.attr({});
    });

    it('method should return data from "relatedData" array',
      function () {
        let relatedData = {
          Snapshot: {
            ids: [1, 2, 3],
          },
        };

        let result = viewModel
          .buildRelatedData(relatedData, 'Snapshot');
        expect(result.Snapshot.ids.length).toEqual(3);
        expect(result.Snapshot.ids[0]).toEqual(1);
      }
    );

    it('method should return data from "deferred_list" array',
      function () {
        let relatedData = {
          Snapshot: {
            ids: [1, 2, 3],
          },
        };
        let result;

        viewModel.attr('deferredList', [
          {id: 5, type: 'Snapshot'},
          {id: 25, type: 'Snapshot'},
        ]);

        result = viewModel
          .buildRelatedData(relatedData, 'Snapshot');
        expect(result.Snapshot.ids.length).toEqual(2);
        expect(result.Snapshot.ids[0]).toEqual(5);
      }
    );

    it('return data from "deferred_list" array. RelatedData is undefined',
      function () {
        let result;

        viewModel.attr('deferredList', [
          {id: 5, type: 'Snapshot'},
          {id: 25, type: 'Snapshot'},
        ]);

        result = viewModel
          .buildRelatedData(undefined, 'Snapshot');
        expect(result.Snapshot.ids.length).toEqual(2);
        expect(result.Snapshot.ids[0]).toEqual(5);
      }
    );
  });
});
