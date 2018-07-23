/*
  Copyright (C) 2018 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import CustomAttributeDefinition from '../custom-attribute-definition';

describe('CustomAttributeDefinition model', function () {
  'use strict';

  let Model;

  beforeAll(function () {
    Model = CustomAttributeDefinition;
  });

  describe('multiChoiceOptions custom validator', function () {
    let validator;
    let instance;

    beforeEach(function () {
      instance = new can.Map({
        attribute_type: 'Dropdown',
      });
      validator = Model._customValidators.multiChoiceOptions.bind(instance);
    });

    it('returns an empty message for properties other ' +
      'than multi_choice_options',
    function () {
      ['foo', 'bar', 'baz'].forEach(function (propName) {
        let msg = validator(',,,', propName);
        expect(msg).toEqual('');
      });
    }
    );

    it('returns an empty message for non-dropdown types', function () {
      Model.attributeTypes.forEach(function (attrType) {
        let msg;

        if (attrType === 'Dropdown') {
          return;
        }

        instance.attr('attribute_type', attrType);

        msg = validator(',,,', 'multi_choice_options');
        expect(msg).toEqual('');
      });
    });

    it('returns an error when no values defined', function () {
      let msg = validator('', 'multi_choice_options');
      expect(msg).toEqual('At least one possible value required.');
    });

    it('returns an error when blank values defined', function () {
      // NOTE: the empty value is the one after the last comma
      let msg = validator('foo  ,  bar ,', 'multi_choice_options');
      expect(msg).toEqual('Blank values not allowed.');
    });

    it('returns an error when duplicate values values defined', function () {
      let msg = validator('foo, bar, baz, foo  , gox', 'multi_choice_options');
      expect(msg).toEqual('Duplicate values found.');
    });

    it('returns an empty message if validation succeeds', function () {
      let msg = validator('  one  two, three,four   ', 'multi_choice_options');
      expect(msg).toEqual('');
    });
  });
});
