/*!
  Copyright (C) 2017 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

'use strict';

describe('GGRC.Utils.AdvancedSearch', function () {
  describe('buildFilterString() method', function () {
    it('builds correct statuses with "ANY" operator', function () {
      var items = [
        GGRC.Utils.AdvancedSearch.create.state({
          items: ['Active', 'Draft', 'Deprecated'],
          operator: 'ANY'
        })
      ];
      var expectedResult = '("Status"="Active" ' +
                           'OR "Status"="Draft" ' +
                           'OR "Status"="Deprecated")';

      expect(GGRC.Utils.AdvancedSearch.buildFilterString(items))
        .toBe(expectedResult);
    });

    it('builds correct statuses with "NONE" operator', function () {
      var items = [
        GGRC.Utils.AdvancedSearch.create.state({
          items: ['Active', 'Draft', 'Deprecated'],
          operator: 'NONE'
        })
      ];
      var expectedResult = '("Status"!="Active" ' +
                           'AND "Status"!="Draft" ' +
                           'AND "Status"!="Deprecated")';

      expect(GGRC.Utils.AdvancedSearch.buildFilterString(items))
        .toBe(expectedResult);
    });

    it('builds correct filter string', function () {
      var items = [
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
            operator: '~=',
            value: 'value'
          })
        ])
      ];
      var expectedResult = '("Status"="Active" OR "Status"="Draft") ' +
                           'AND "Title" ~ "test" ' +
                           'OR ("Para" = "meter" AND "Other" ~= "value")';
      expect(GGRC.Utils.AdvancedSearch.buildFilterString(items))
        .toBe(expectedResult);
    });
  });
});
