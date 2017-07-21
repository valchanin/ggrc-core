/*!
  Copyright (C) 2017 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

describe('GGRC.Components.advancedSearchWrapper', function () {
  'use strict';

  var viewModel;
  var events;
  beforeEach(function () {
    viewModel = GGRC.Components.getViewModel('advancedSearchWrapper');
    events = GGRC.Components.get('advancedSearchWrapper').prototype.events;
  });

  describe('"{viewModel} modelName" handler', function () {
    var that;
    var handler;
    beforeEach(function () {
      that = {
        viewModel: viewModel
      };
      handler = events['{viewModel} modelName'];
    });

    it('calls resetFilters() method', function () {
      spyOn(viewModel, 'resetFilters');
      handler.call(that);
      expect(viewModel.resetFilters).toHaveBeenCalled();
    });
  });

  describe('filterString() method', function () {
    it('builds correct filter string', function () {
      spyOn(GGRC.Utils.State, 'getDefaultStatesForModel');
      viewModel.attr('filterItems', [
        GGRC.Utils.AdvancedSearch.create.state({
          items: ['Active', 'Draft'],
          operator: 'ANY'
        }),
        GGRC.Utils.AdvancedSearch.create.operator('AND'),
        GGRC.Utils.AdvancedSearch.create.attribute({
          field: 'Title',
          operator: '~',
          value: 'test'
        }),
        GGRC.Utils.AdvancedSearch.create.operator('OR'),
        GGRC.Utils.AdvancedSearch.create.group([
          GGRC.Utils.AdvancedSearch.create.attribute({
            field: 'Para',
            operator: '=',
            value: 'meter'
          }),
          GGRC.Utils.AdvancedSearch.create.operator('AND'),
          GGRC.Utils.AdvancedSearch.create.attribute({
            field: 'Other',
            operator: '!=',
            value: 'value'
          })
        ])
      ]);

      viewModel.attr('mappingItems', [
        GGRC.Utils.AdvancedSearch.create.mappingCriteria({
          objectName: 'Product',
          filter: GGRC.Utils.AdvancedSearch.create.attribute({
            field: 'title',
            operator: '~',
            value: 'A'
          }),
          mappedTo: GGRC.Utils.AdvancedSearch.create.mappingCriteria({
            objectName: 'System',
            filter: GGRC.Utils.AdvancedSearch.create.attribute({
              field: 'title',
              operator: '~',
              value: 'B'
            })
          })
        }),
        GGRC.Utils.AdvancedSearch.create.operator('AND'),
        GGRC.Utils.AdvancedSearch.create.mappingCriteria({
          objectName: 'Control',
          filter: GGRC.Utils.AdvancedSearch.create.attribute({
            field: 'title',
            operator: '~',
            value: 'C'
          }),
          mappedTo: GGRC.Utils.AdvancedSearch.create.group([
            GGRC.Utils.AdvancedSearch.create.mappingCriteria({
              objectName: 'System',
              filter: GGRC.Utils.AdvancedSearch.create.attribute({
                field: 'title',
                operator: '~',
                value: 'D'
              })
            }),
            GGRC.Utils.AdvancedSearch.create.operator('OR'),
            GGRC.Utils.AdvancedSearch.create.mappingCriteria({
              objectName: 'System',
              filter: GGRC.Utils.AdvancedSearch.create.attribute({
                field: 'title',
                operator: '~',
                value: 'E'
              })
            })
          ])
        })
      ]);
      viewModel.attr('modelDisplayName', 'TestType');
      viewModel.attr('relevantTo', [{type: 'Audit', title: 'test'}]);

      expect(viewModel.filterString()).toBe(
        'TestType AND state = ("Active", "Draft") ' +
        'AND Title contains "test" OR ' +
        '(Para equals "meter" AND Other is not equal "value") ' +
        'AND mapped to Audit test ' +
        'AND mapped to Product with title contains "A" ' +
        'where Product is mapped to System with title contains "B" ' +
        'AND mapped to Control with title contains "C" ' +
        'where Control is (mapped to System with title contains "D" ' +
        'OR mapped to System with title contains "E")');
    });
  });
});
