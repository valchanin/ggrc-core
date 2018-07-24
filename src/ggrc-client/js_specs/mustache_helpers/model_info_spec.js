/*
  Copyright (C) 2018 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import * as businessModels from '../../js/models/business-models';

describe('can.mustache.helper.model_info', function () {
  'use strict';

  let helper;
  let fakeModel;
  let fakeOptions; // a fake "options" argument
  let origModel; // the original model, if any, in the Models

  beforeAll(function () {
    helper = can.Mustache._helpers.model_info.fn;
  });

  beforeEach(function () {
    origModel = businessModels.ModelFoo;
    fakeModel = {};
    businessModels.ModelFoo = fakeModel;

    fakeOptions = {};
  });

  afterEach(function () {
    businessModels.ModelFoo = origModel;
  });

  it('returns the value of the correct model attribute', function () {
    let result;
    fakeModel.someAttribute = 'foo bar baz';
    result = helper('ModelFoo', 'someAttribute', fakeOptions);
    expect(result).toEqual('foo bar baz');
  });

  it('raises an error on missing arguments', function () {
    expect(function () {
      helper('ModelFoo', fakeOptions);
    }).toThrow(new Error('Invalid number of arguments (1), expected 2.'));
  });

  it('raises an error on too many arguments', function () {
    expect(function () {
      helper('ModelFoo', 'property1', 'property2', fakeOptions);
    }).toThrow(new Error('Invalid number of arguments (3), expected 2.'));
  });

  it('raises an error on an unknown model', function () {
    delete businessModels.ModelFoo;

    expect(function () {
      helper('ModelFoo', 'property', fakeOptions);
    }).toThrow(new Error('Model not found (ModelFoo).'));
  });
});
