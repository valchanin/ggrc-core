/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

describe('GGRC.Components.relatedDocuments', function () {
  'use strict';

  let viewModel;
  let instance;

  beforeEach(function () {
    viewModel = GGRC.Components.getViewModel('relatedDocuments');
    instance = {
      id: '5',
      type: 'Assessment',
    };

    viewModel.attr('instance', instance);
  });

  describe('"getDocumentsQuery" method', function () {
    function checkAdditionFilter(documentType) {
      let query;
      let additionFilter;
      viewModel.attr('documentType', documentType);
      query = viewModel.getDocumentsQuery();

      expect(query.filters.expression).toBeDefined();
      additionFilter = query.filters.expression.right;
      expect(additionFilter.left).toEqual('document_type');
      expect(additionFilter.right).toEqual(documentType);
    }

    it('should get query for urls', function () {
      checkAdditionFilter('URL');
    });

    it('should get query for evidences', function () {
      checkAdditionFilter('EVIDENCE');
    });

    it('should get query for all documents', function () {
      let query;
      let expression;
      viewModel.attr('documentType', undefined);
      query = viewModel.getDocumentsQuery();
      expression = query.filters.expression;
      expect(expression).toBeDefined();
      expect(expression.object_name).toEqual(instance.type);
      expect(expression.ids[0]).toEqual(instance.id);
    });
  });
});
