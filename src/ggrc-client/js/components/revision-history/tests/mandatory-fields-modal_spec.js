/*
 Copyright (C) 2018 Google Inc., authors, and contributors
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import Cacheable from '../../../models/cacheable';
import {getComponentVM} from '../../../../js_specs/spec_helpers';
import Component from '../mandatory-fields-modal';

describe('mandatory-fields-modal component', () => {
  let viewModel;

  beforeEach(function () {
    viewModel = getComponentVM(Component);
  });

  describe('initModal() method', () => {
    let method;

    beforeEach(()=> {
      method = viewModel.initModal.bind(viewModel);
    });

    it('sets invalid mandatory CA fields', () => {
      let caFields = [{id: 1}, {id: 2}, {id: 3}];
      spyOn(viewModel, 'getInvalidCAsFields').and
        .returnValue(caFields);

      method();

      expect(viewModel.getInvalidCAsFields).toHaveBeenCalled();
      expect(viewModel.attr('caFields').length).toBe(3);
    });
  });

  describe('getInvalidCAsFields', () => {
    let method;

    beforeEach(()=> {
      method = viewModel.getInvalidCAsFields.bind(viewModel);
    });

    it('filters invalid mandatory CAs', () => {
      let instance = new Cacheable({});
      spyOn(instance, 'customAttr').and.returnValue([
        {
          id: 1,
          validationState: {
            hasGCAErrors: false,
          },
        },
        {
          id: 2,
          validationState: {
            hasGCAErrors: true,
          },
        },
      ]);
      viewModel.attr('instance', instance);

      let result = method();
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(2);
      delete Cacheable.cache;
    });
  });
});
