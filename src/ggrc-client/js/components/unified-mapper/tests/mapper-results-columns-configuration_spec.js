/*
  Copyright (C) 2018 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {getComponentVM} from '../../../../js_specs/spec_helpers';
import * as TreeViewUtils from '../../../plugins/utils/tree-view-utils';
import Component from '../mapper-results-columns-configuration';
import DisplayPrefs from '../../../models/local-storage/display-prefs';

describe('mapper-results-columns-configuration component', function () {
  'use strict';
  let viewModel;

  beforeAll(function () {
    viewModel = getComponentVM(Component);
  });

  describe('set() of viewModel.selectedColumns', function () {
    beforeEach(function () {
      spyOn(viewModel, 'initializeColumns');
    });

    it('updates value of viewModel.selectedColumns', function () {
      viewModel.attr('selectedColumns', 123);
      expect(viewModel.attr('selectedColumns')).toEqual(123);
    });

    it('calls viewModel.initializeColumns()', function () {
      viewModel.attr('selectedColumns', 123);
      expect(viewModel.initializeColumns).toHaveBeenCalled();
    });
  });

  describe('set() of viewModel.availableColumns', function () {
    beforeEach(function () {
      spyOn(viewModel, 'initializeColumns');
    });

    it('updates value of viewModel.availableColumns',
      function () {
        viewModel.attr('availableColumns', 123);
        expect(viewModel.attr('availableColumns')).toEqual(123);
      });

    it('calls viewModel.initializeColumns()',
      function () {
        viewModel.attr('availableColumns', 123);
        expect(viewModel.initializeColumns).toHaveBeenCalled();
      });
  });

  describe('init() method', function () {
    const displayPrefs = 'displayPrefs';

    beforeEach(function () {
      spyOn(viewModel, 'initializeColumns');
      spyOn(DisplayPrefs, 'getSingleton')
        .and.returnValue($.Deferred().resolve(displayPrefs));
    });

    it('calls initializeColumns()', function () {
      viewModel.init();
      expect(viewModel.initializeColumns).toHaveBeenCalled();
    });

    it('updates viewModel.displayPrefs', function () {
      viewModel.init();
      expect(viewModel.attr('displayPrefs'))
        .toEqual(displayPrefs);
    });
  });

  describe('getModel() method', function () {
    it('returns the current model type constructor', function () {
      let result;
      viewModel.attr('modelType', 'Program');
      result = viewModel.getModel();
      expect(result).toEqual(CMS.Models.Program);
    });
  });

  describe('initializeColumns() method', function () {
    let selectedColumns;
    let availableColumns;

    beforeAll(function () {
      selectedColumns = new can.makeArray([
        new can.Map({attr_name: 'title'}),
      ]);
      availableColumns = new can.makeArray([
        new can.Map({attr_name: 'title'}),
        new can.Map({attr_name: 'date'}),
      ]);
    });

    beforeEach(function () {
      viewModel.attr('selectedColumns', selectedColumns);
      viewModel.attr('availableColumns', availableColumns);
    });

    it('updates viewModel.columns', function () {
      let columns;
      viewModel.initializeColumns();
      columns = viewModel.attr('columns');

      expect(columns.length).toBe(2);
      expect(columns[0].name).toEqual('title');
      expect(columns[0].selected).toBeTruthy();
      expect(columns[1].name).toEqual('date');
      expect(columns[1].selected).toBeFalsy();
    });
  });

  describe('setColumns() method', function () {
    beforeEach(function () {
      viewModel.attr('columns', [
        {name: 'title', selected: true},
        {name: 'date', selected: false},
      ]);
      spyOn(TreeViewUtils, 'setColumnsForModel')
        .and.returnValue({
          selected: 'selectedColumns',
        });
    });

    it('updates value of viewModel.selectedColumns', function () {
      viewModel.setColumns();
      expect(viewModel.selectedColumns).toEqual('selectedColumns');
    });
  });

  describe('stopPropagation() method', function () {
    let event;

    beforeEach(function () {
      event = {
        stopPropagation: function () {},
      };
      spyOn(event, 'stopPropagation');
    });

    it('calls stopPropagation of event',
      function () {
        viewModel.stopPropagation({}, {}, event);
        expect(event.stopPropagation).toHaveBeenCalled();
      });
  });
});
