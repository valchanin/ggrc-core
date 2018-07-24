/*
  Copyright (C) 2018 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import * as TreeViewUtils from '../../../plugins/utils/tree-view-utils';
import * as AdvancedSearch from '../../../plugins/utils/advanced-search-utils';
import {getComponentVM} from '../../../../js_specs/spec_helpers';
import Component from '../advanced-search-mapping-criteria';
import Mappings from '../../../models/mappers/mappings';
import * as businessModels from '../../../models/business-models';

describe('advanced-search-mapping-criteria component', function () {
  'use strict';

  let viewModel;

  beforeEach(() => {
    viewModel = getComponentVM(Component);
  });

  describe('criteria set() method', function () {
    it('initializes "criteria.filter" property with new attribute model',
      function () {
        viewModel.attr('criteria', can.Map());

        expect(viewModel.attr('criteria.filter').type).toBe('attribute');
      });

    it('does not intialize "criteria.filter" when it is already initialized',
      function () {
        viewModel.attr('criteria', new can.Map({
          filter: {
            type: 'test',
          },
        }));

        expect(viewModel.attr('criteria.filter').type).toBe('test');
      });
  });

  describe('remove() method', function () {
    it('dispatches "remove" event', function () {
      spyOn(viewModel, 'dispatch');

      viewModel.remove();

      expect(viewModel.dispatch).toHaveBeenCalledWith('remove');
    });
  });

  describe('addRelevant() method', function () {
    it('adds mapping criteria', function () {
      viewModel.attr('criteria', can.Map());

      viewModel.addRelevant();

      expect(viewModel.attr('criteria.mappedTo').type).toBe('mappingCriteria');
    });
  });

  describe('removeRelevant() method', function () {
    it('removes mapping criteria', function () {
      viewModel.attr('criteria', new can.Map({
        mappedTo: {},
      }));

      viewModel.removeRelevant();

      expect(viewModel.attr('criteria.mappedTo')).toBe(undefined);
    });
  });

  describe('createGroup() method', function () {
    it('dispatches "createGroup" event', function () {
      spyOn(viewModel, 'dispatch');

      viewModel.createGroup();

      expect(viewModel.dispatch).toHaveBeenCalledWith('createGroup');
    });
  });

  describe('relevantToGroup() method', function () {
    it('transforms criteria to group with 2 criteria and operator inside',
      function () {
        let relevant;
        viewModel.attr('criteria.mappedTo',
          AdvancedSearch.create.mappingCriteria()
        );

        viewModel.relevantToGroup();

        relevant = viewModel.attr('criteria.mappedTo');
        expect(relevant.type).toBe('group');
        expect(relevant.value[0].type).toBe('mappingCriteria');
        expect(relevant.value[1].type).toBe('operator');
        expect(relevant.value[2].type).toBe('mappingCriteria');
      });
  });

  describe('mappingTypes() method', function () {
    beforeEach(function () {
      spyOn(Mappings, 'get_canonical_mappings_for').and.returnValue({
        type1: {},
        type2: {},
        type3: {},
        type4: {},
        type5: {},
      });

      businessModels['type1'] = {
        model_singular: '3',
        title_singular: '3',
      };
      businessModels['type2'] = {
        model_singular: '1',
        title_singular: '1',
      };
      businessModels['type3'] = {
        model_singular: '2',
        title_singular: null,
      };
      businessModels['type4'] = null;
      businessModels['type5'] = {
        model_singular: null,
        title_singular: '4',
      };
    });
    afterEach(function () {
      businessModels['type1'] = null;
      businessModels['type2'] = null;
      businessModels['type3'] = null;
      businessModels['type4'] = null;
      businessModels['type5'] = null;
    });

    describe('if it is in clone modal', () => {
      let modelName;

      beforeEach(() => {
        viewModel.attr('isClone', true);
      });

      it('returns only model with name as modelName attribute', () => {
        modelName = 'Audit';

        viewModel.attr('modelName', modelName);

        expect(viewModel.mappingTypes()).toEqual([businessModels[modelName]]);
      });

      it('sets modelName attribute to criteria.objectName', () => {
        modelName = 'Audit';

        viewModel.attr('criteria', new can.Map());
        viewModel.attr('modelName', modelName);
        viewModel.mappingTypes();

        expect(viewModel.attr('criteria.objectName')).toBe(modelName);
      });
    });

    it('retrieves canonical mappings for correct model', function () {
      viewModel.attr('modelName', 'testModel');

      viewModel.mappingTypes();

      expect(Mappings.get_canonical_mappings_for)
        .toHaveBeenCalledWith('testModel');
    });

    it('returns correct filtered and sorted types', function () {
      let result = viewModel.mappingTypes();

      expect(result).toEqual([
        {
          model_singular: '1',
          title_singular: '1',
        },
        {
          model_singular: '3',
          title_singular: '3',
        },
      ]);
    });

    it('sets criteria.objectName if objectName is not defined', function () {
      viewModel.attr('criteria.objectName', undefined);

      viewModel.mappingTypes();

      expect(viewModel.attr('criteria.objectName')).toBe('1');
    });

    it('does not set criteria.objectName if objectName is defined',
      function () {
        viewModel.attr('criteria.objectName', 'test');

        viewModel.mappingTypes();

        expect(viewModel.attr('criteria.objectName')).toBe('test');
      });
  });

  describe('availableAttributes() method', function () {
    it('returns available attributes', function () {
      let attributes = ['attr1', 'attr2'];
      spyOn(TreeViewUtils, 'getColumnsForModel').and.returnValue({
        available: attributes,
      });
      viewModel.attr('criteria.objectName', 'test');

      expect(viewModel.availableAttributes()).toBe(attributes);
      expect(TreeViewUtils.getColumnsForModel).toHaveBeenCalledWith(
        'test',
        null
      );
    });
  });
});
