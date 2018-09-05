/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import {makeFakeInstance} from '../../../../js_specs/spec_helpers';
import * as TreeViewUtils from '../../../plugins/utils/tree-view-utils';
import * as CurrentPageUtils from '../../../plugins/utils/current-page-utils';
import * as AdvancedSearch from '../../../plugins/utils/advanced-search-utils';
import tracker from '../../../tracker';
import {getComponentVM} from '../../../../js_specs/spec_helpers';
import Component from '../tree-widget-container';
import Relationship from '../../../models/service-models/relationship';
import DisplayPrefs from '../../../models/local-storage/display-prefs';
import router from '../../../router';

describe('tree-widget-container component', function () {
  'use strict';

  let vm;

  beforeEach(function () {
    vm = getComponentVM(Component);
  });

  describe('display() method', function () {
    let display;
    let dfd;

    beforeEach(function () {
      dfd = new $.Deferred();

      display = vm.display.bind(vm);
      spyOn(vm, 'loadItems').and.returnValue(dfd);
      vm.attr('loaded', null);
      vm.attr('refreshLoaded', true);
    });

    it('sets loaded field if it does not exist', function () {
      display();
      expect(vm.attr('loaded')).not.toBeNull();
    });

    it('sets loaded field if needToRefresh param is true', function () {
      vm.attr('loaded', dfd);
      display(true);
      expect(vm.attr('loaded')).not.toBeNull();
    });

    it('sets refreshLoaded flag in false after resolve loaded field',
      function () {
        display(true);
        dfd.resolve();
        expect(vm.attr('refreshLoaded')).toBe(false);
      });

    it('returns value of loaded field', function () {
      let result;
      vm.attr('loaded', dfd);
      result = display();
      expect(result).toBe(dfd);
    });
  });

  describe('onSort() method', function () {
    let onSort;

    beforeEach(function () {
      onSort = vm.onSort.bind(vm);
      vm.attr('pageInfo.count', 3);

      spyOn(vm, 'loadItems');
      spyOn(vm, 'closeInfoPane');
    });

    it('sets current order properties', function () {
      onSort({
        field: 'col1',
        sortDirection: 'asc',
      });

      expect(vm.attr('sortingInfo.sortBy')).toEqual('col1');
      expect(vm.attr('sortingInfo.sortDirection')).toEqual('asc');
      expect(vm.attr('pageInfo.current')).toEqual(1);
      expect(vm.loadItems).toHaveBeenCalled();
      expect(vm.closeInfoPane).toHaveBeenCalled();
    });
  });

  describe('loadItems() method', function () {
    let loadItems;

    beforeEach(function () {
      vm.attr({
        model: {shortName: 'modelName'},
        options: {
          parent_instance: {},
        },
      });
      loadItems = vm.loadItems.bind(vm);
      spyOn(tracker, 'start').and.returnValue(() => {});
    });

    it('', function (done) {
      spyOn(TreeViewUtils, 'loadFirstTierItems')
        .and.returnValue(can.Deferred().resolve({
          total: 100,
          values: [],
        }));

      loadItems().then(function () {
        expect(vm.attr('pageInfo.total')).toEqual(100);
        expect(can.makeArray(vm.attr('showedItems'))).toEqual([]);
        done();
      });
    });
  });

  describe('setRefreshFlag() method', function () {
    let setRefreshFlag;

    beforeEach(function () {
      setRefreshFlag = vm.setRefreshFlag.bind(vm);
      vm.attr('refreshLoaded', null);
    });

    it('sets refreshLoaded state in true if refresh param is true',
      function () {
        setRefreshFlag(true);
        expect(vm.attr('refreshLoaded')).toBe(true);
      });

    it('sets refreshLoaded state in false if refresh param is false',
      function () {
        setRefreshFlag(false);
        expect(vm.attr('refreshLoaded')).toBe(false);
      });
  });

  describe('needToRefresh() method', function () {
    let needToRefresh;
    let setRefreshFlag;

    beforeEach(function () {
      needToRefresh = vm.needToRefresh.bind(vm);
      setRefreshFlag = vm.setRefreshFlag.bind(vm);
      vm.attr('refreshLoaded', null);
    });

    it('returns true if refreshLoaded field is true',
      function () {
        let result;
        setRefreshFlag(true);
        result = needToRefresh();

        expect(result).toBe(true);
      });

    it('returns false if refreshLoaded field is false',
      function () {
        let result;
        setRefreshFlag(false);
        result = needToRefresh();

        expect(result).toBe(false);
      });
  });

  describe('on widget appearing', function () {
    let _widgetShown;

    beforeEach(function () {
      _widgetShown = vm._widgetShown.bind(vm);
      spyOn(vm, '_triggerListeners');
      spyOn(vm, 'loadItems');
    });

    describe('for any viewModel except Issue', function () {
      beforeEach(function () {
        let modelName = 'Model';
        spyOn(CurrentPageUtils, 'getCounts').and.returnValue(
          _.set({}, modelName, 123)
        );
        vm.attr({
          options: {
            countsName: modelName,
          },
          loaded: {},
          pageInfo: {
            total: 123,
          },
        });
      });

      it('should only add listeners', function () {
        _widgetShown();
        expect(vm._triggerListeners).toHaveBeenCalled();
        expect(vm.loadItems).not.toHaveBeenCalled();
      });
    });

    describe('for Issue viewModel that wasn\'t loaded before', function () {
      let modelName = 'Issue';

      beforeEach(function () {
        vm.attr({
          options: {
            countsName: modelName,
          },
        });
        vm.attr('loaded', null);
        vm.attr('pageInfo', {
          total: 123,
        });
        spyOn(CurrentPageUtils, 'getCounts').and.returnValue(
          _.set({}, modelName, 123)
        );
      });

      it('should only add listeners', function () {
        _widgetShown();
        expect(vm._triggerListeners).toHaveBeenCalled();
        expect(vm.loadItems).not.toHaveBeenCalled();
      });
    });

    describe('for Issue viewModel that was loaded before' +
      'in case of equality between counts on tab ' +
      'and total counts in viewModel',
    function () {
      let modelName = 'Issue';

      beforeEach(function () {
        vm.attr({
          options: {
            countsName: modelName,
          },
        });
        vm.attr('loaded', {});
        vm.attr('pageInfo', {
          total: 123,
        });
        spyOn(CurrentPageUtils, 'getCounts').and.returnValue(
          _.set({}, modelName, 123)
        );
      });

      it('should only add listeners', function () {
        _widgetShown();
        expect(vm._triggerListeners).toHaveBeenCalled();
        expect(vm.loadItems).not.toHaveBeenCalled();
      });
    }
    );

    describe('for Issue viewModel that was loaded before' +
      'in case of inequality between counts on tab ' +
      'and total counts in viewModel',
    function () {
      let modelName = 'Issue';

      beforeEach(function () {
        vm.attr({
          model: {
            shortName: modelName,
          },
          modelName: modelName,
        });
        vm.attr('loaded', {});
        vm.attr('pageInfo', {
          total: 123,
        });
        spyOn(CurrentPageUtils, 'getCounts').and.returnValue(
          _.set({}, modelName, 124)
        );
      });

      it('should add listeners and update viewModel', function () {
        _widgetShown();
        expect(vm._triggerListeners).toHaveBeenCalled();
        expect(vm.loadItems).toHaveBeenCalled();
      });
    }
    );
  });

  describe('openAdvancedFilter() method', function () {
    it('copies applied filter and mapping items', function () {
      let appliedFilterItems = new can.List([
        AdvancedSearch.create.attribute(),
      ]);
      let appliedMappingItems = new can.List([
        AdvancedSearch.create.mappingCriteria({
          filter: AdvancedSearch.create.attribute(),
        }),
      ]);
      vm.attr('advancedSearch.appliedFilterItems', appliedFilterItems);
      vm.attr('advancedSearch.appliedMappingItems', appliedMappingItems);
      vm.attr('advancedSearch.filterItems', can.List());
      vm.attr('advancedSearch.mappingItems', can.List());

      vm.openAdvancedFilter();

      expect(vm.attr('advancedSearch.filterItems').attr())
        .toEqual(appliedFilterItems.attr());
      expect(vm.attr('advancedSearch.mappingItems').attr())
        .toEqual(appliedMappingItems.attr());
    });

    it('opens modal window', function () {
      vm.attr('advancedSearch.open', false);

      vm.openAdvancedFilter();

      expect(vm.attr('advancedSearch.open')).toBe(true);
    });
  });

  describe('applyAdvancedFilters() method', function () {
    let filterItems = new can.List([
      AdvancedSearch.create.attribute(),
    ]);
    let mappingItems = new can.List([
      AdvancedSearch.create.mappingCriteria({
        filter: AdvancedSearch.create.attribute(),
      }),
    ]);
    beforeEach(function () {
      vm.attr('advancedSearch.filterItems', filterItems);
      vm.attr('advancedSearch.mappingItems', mappingItems);
      vm.attr('advancedSearch.appliedFilterItems', can.List());
      vm.attr('advancedSearch.appliedMappingItems', can.List());
      spyOn(vm, 'onFilter');
      spyOn(AdvancedSearch, 'buildFilter')
        .and.callFake(function (items, request) {
          request.push({name: 'item'});
        });
      spyOn(GGRC.query_parser, 'join_queries');
    });

    it('copies filter and mapping items to applied', function () {
      vm.applyAdvancedFilters();

      expect(vm.attr('advancedSearch.appliedFilterItems').attr())
        .toEqual(filterItems.attr());
      expect(vm.attr('advancedSearch.appliedMappingItems').attr())
        .toEqual(mappingItems.attr());
    });

    it('initializes advancedSearch.filter property', function () {
      GGRC.query_parser.join_queries.and.returnValue({
        name: 'test',
      });
      vm.attr('advancedSearch.filter', null);

      vm.applyAdvancedFilters();

      expect(vm.attr('advancedSearch.filter.name')).toBe('test');
    });

    it('initializes advancedSearch.request property', function () {
      vm.attr('advancedSearch.request', can.List());


      vm.applyAdvancedFilters();

      expect(vm.attr('advancedSearch.request.length')).toBe(2);
    });

    it('closes modal window', function () {
      vm.attr('advancedSearch.open', true);

      vm.applyAdvancedFilters();

      expect(vm.attr('advancedSearch.open')).toBe(false);
    });

    it('calls onFilter() method', function () {
      vm.applyAdvancedFilters();

      expect(vm.onFilter).toHaveBeenCalled();
    });
  });

  describe('removeAdvancedFilters() method', function () {
    beforeEach(function () {
      spyOn(vm, 'onFilter');
    });

    it('removes applied filter and mapping items', function () {
      vm.attr('advancedSearch.appliedFilterItems', new can.List([
        {title: 'item'},
      ]));
      vm.attr('advancedSearch.appliedMappingItems', new can.List([
        {title: 'item'},
      ]));

      vm.removeAdvancedFilters();

      expect(vm.attr('advancedSearch.appliedFilterItems.length')).toBe(0);
      expect(vm.attr('advancedSearch.appliedMappingItems.length')).toBe(0);
    });

    it('cleans advancedSearch.filter property', function () {
      vm.attr('advancedSearch.filter', {});

      vm.removeAdvancedFilters();

      expect(vm.attr('advancedSearch.filter')).toBe(null);
    });

    it('closes modal window', function () {
      vm.attr('advancedSearch.open', true);

      vm.removeAdvancedFilters();

      expect(vm.attr('advancedSearch.open')).toBe(false);
    });

    it('calls onFilter() method', function () {
      vm.removeAdvancedFilters();

      expect(vm.onFilter).toHaveBeenCalled();
    });

    it('resets advancedSearch.request list', function () {
      vm.attr('advancedSearch.request', new can.List([{data: 'test'}]));

      vm.removeAdvancedFilters();

      expect(vm.attr('advancedSearch.request.length')).toBe(0);
    });
  });

  describe('resetAdvancedFilters() method', function () {
    it('resets filter items', function () {
      vm.attr('advancedSearch.filterItems', new can.List([
        {title: 'item'},
      ]));

      vm.resetAdvancedFilters();

      expect(vm.attr('advancedSearch.filterItems.length')).toBe(0);
    });

    it('resets mapping items', function () {
      vm.attr('advancedSearch.mappingItems', new can.List([
        {title: 'item'},
      ]));

      vm.resetAdvancedFilters();

      expect(vm.attr('advancedSearch.mappingItems.length')).toBe(0);
    });
  });

  describe('getAbsoluteItemNumber() method', function () {
    beforeEach(function () {
      vm.attr({
        pageInfo: {
          pageSize: 10,
          count: 5,
        },
        showedItems: [{id: 1, type: 'object'},
          {id: 2, type: 'object'},
          {id: 3, type: 'object'}],
      });
      vm.attr('pageInfo.current', 3);
    });

    it('should return correct item number when item is on page',
      function () {
        let result;

        result = vm.getAbsoluteItemNumber({id: 2, type: 'object'});

        expect(result).toEqual(21);
      });

    it('should return "-1" when item is not on page',
      function () {
        let result;

        result = vm.getAbsoluteItemNumber({id: 4, type: 'object'});

        expect(result).toEqual(-1);
      });
    it('should return "-1" when item is of different type',
      function () {
        let result;

        result = vm.getAbsoluteItemNumber({id: 3, type: 'snapshot'});

        expect(result).toEqual(-1);
      });
    it('should return correct item number for first item on non first page',
      function () {
        let result;

        result = vm.getAbsoluteItemNumber({id: 1, type: 'object'});

        expect(result).toEqual(20);
      });
  });

  describe('getRelativeItemNumber() method', function () {
    it('should return correct item number on page', function () {
      let result = vm.getRelativeItemNumber(12, 5);

      expect(result).toEqual(2);
    });
  });

  describe('getNextItemPage() method', function () {
    beforeEach(function () {
      spyOn(vm, 'loadItems');
    });

    it('should load items for appropriate page when item is not loaded',
      function () {
        vm.getNextItemPage(10, {current: 2, pageSize: 5});

        expect(vm.attr('loading')).toBeTruthy();
        expect(vm.loadItems).toHaveBeenCalled();
      });

    it('shouldn\'t load items when current item was already loaded',
      function () {
        vm.getNextItemPage(10, {current: 3, pageSize: 5});

        expect(vm.attr('loading')).toBeFalsy();
        expect(vm.loadItems).not.toHaveBeenCalled();
      });
  });

  describe('setSortingConfiguration() method', () => {
    beforeEach(() => {
      vm.attr('model', {
        shortName: 'shortModelName',
      });
    });

    it('sets up default sorting configuration', () => {
      vm.attr('sortingInfo', {});
      spyOn(TreeViewUtils, 'getSortingForModel')
        .and.returnValue({
          key: 'key',
          direction: 'direction',
        });

      vm.setSortingConfiguration();

      expect(vm.attr('sortingInfo.sortBy')).toEqual('key');
      expect(vm.attr('sortingInfo.sortDirection')).toEqual('direction');
    });
  });

  describe('init() method', () => {
    let method;

    beforeEach(() => {
      vm.attr('model', {
        shortName: 'shortModelName',
      });
      method = Component.prototype.init.bind({viewModel: vm});
      spyOn(vm, 'setSortingConfiguration');
      spyOn(vm, 'setColumnsConfiguration');
      spyOn(DisplayPrefs, 'getSingleton')
        .and.returnValue(can.Deferred().resolve());
    });

    it('sets up columns configuration', () => {
      method();
      expect(vm.setColumnsConfiguration).toHaveBeenCalled();
    });

    it('sets up sorting configuration', () => {
      method();
      expect(vm.setSortingConfiguration).toHaveBeenCalled();
    });
  });

  describe('getDepthFilter() method', function () {
    it('returns an empty string if depth is not set for filter', function () {
      let result;
      spyOn(vm, 'attr')
        .and.returnValue([{
          query: {
            expression: {
              left: 'task assignees',
              op: {name: '='},
              right: 'user@example.com',
            },
          },
          name: 'custom',
        }, {
          query: {
            expression: {
              left: 'state',
              op: {name: '='},
              right: 'Assigned',
            },
          },
          name: 'custom',
        }]);

      result = vm.getDepthFilter();

      expect(result).toBe(null);
    });

    it('returns filter that applied for depth', function () {
      let result;
      spyOn(vm, 'attr')
        .and.returnValue([{
          query: {
            expression: {
              left: 'task assignees',
              op: {name: '='},
              right: 'user@example.com',
            },
          },
          name: 'custom',
          depth: true,
          filterDeepLimit: 2,
        }, {
          query: {
            expression: {
              left: 'state',
              op: {name: '='},
              right: 'Assigned',
            },
          },
          name: 'custom',
          depth: true,
          filterDeepLimit: 1,
        }]);

      result = vm.getDepthFilter(1);

      expect(result).toEqual({
        expression: {
          left: 'task assignees',
          op: {name: '='},
          right: 'user@example.com',
        },
      });
    });
  });

  describe('_needToRefreshAfterRelRemove() method', () => {
    let relationship;

    beforeEach(function () {
      relationship = {
        source: {},
        destination: {},
      };
      vm.attr('options.parent_instance', {
        type: 'Type',
        id: 1,
      });
    });

    describe('returns true', () => {
      it('if source of passed relationship is current instance', function () {
        const source = {
          type: 'SomeType',
          id: 12345,
        };
        vm.attr('parent_instance').attr(source);
        Object.assign(relationship.source, source);
        const result = vm._needToRefreshAfterRelRemove(relationship);
        expect(result).toBe(true);
      });

      it('if source of passed relationship is current instance', function () {
        const destination = {
          type: 'SomeType',
          id: 12345,
        };
        vm.attr('parent_instance').attr(destination);
        Object.assign(relationship.destination, destination);
        const result = vm._needToRefreshAfterRelRemove(relationship);
        expect(result).toBe(true);
      });
    });

    it('returns false when there are no need to refresh', function () {
      const result = vm._needToRefreshAfterRelRemove(relationship);
      expect(result).toBe(false);
    });
  });

  describe('_isRefreshNeeded() method', () => {
    describe('if instance is relationship then', () => {
      let instance;

      beforeEach(function () {
        instance = makeFakeInstance({model: Relationship})();
      });

      it('returns result of the relationship check', function () {
        const expectedResult = true;
        spyOn(vm, '_needToRefreshAfterRelRemove')
          .and.returnValue(expectedResult);
        const result = vm._isRefreshNeeded(instance);
        expect(result).toBe(expectedResult);
        expect(vm._needToRefreshAfterRelRemove)
          .toHaveBeenCalledWith(instance);
      });
    });

    it('returns true by default', function () {
      const result = vm._isRefreshNeeded();
      expect(result).toBe(true);
    });
  });

  describe('showLastPage() method', () => {
    beforeEach(() => {
    });

    it('assigns last page index to pageInfo.current', () => {
      const count = 711;
      vm.attr('pageInfo.count', count);
      vm.attr('pageInfo.current', count + 1);

      vm.showLastPage();

      expect(vm.attr('pageInfo.current')).toBe(count);
    });
  });

  describe('disableFilters get()', () => {
    describe('returns false', () => {
      it('if there are no advancedSearch and import filters', () => {
        router.removeAttr('importId');
        vm.attr('advancedSearch', {});

        let result = vm.attr('disableFilters');

        expect(result).toBe(false);
      });
    });

    describe('returns true', () => {
      it('if there is import filter', () => {
        router.attr('importId', 'test');
        vm.attr('advancedSearch', {});

        let result = vm.attr('disableFilters');

        expect(result).toBe(true);
      });

      it('if there is advancedSearch filter', () => {
        router.removeAttr('importId');
        vm.attr('advancedSearch', {filter: {}});

        let result = vm.attr('disableFilters');

        expect(result).toBe(true);
      });

      it('if there are import and advancedSearch filters', () => {
        router.attr('importId', 'test');
        vm.attr('advancedSearch', {filter: {}});

        let result = vm.attr('disableFilters');

        expect(result).toBe(true);
      });
    });
  });

  describe('removeImportFilter() method', () => {
    beforeEach(() => {
      spyOn(vm, 'onFilter');
    });

    it('removes importId option from route', () => {
      router.attr('importId', 'test');

      vm.removeImportFilter();

      let result = router.attr('importId');
      expect(result).toBeUndefined();
    });

    it('launches search', () => {
      vm.removeImportFilter();

      expect(vm.onFilter).toHaveBeenCalled();
    });
  });
});
