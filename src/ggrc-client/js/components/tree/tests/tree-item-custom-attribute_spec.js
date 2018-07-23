/*
  Copyright (C) 2018 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Cacheable from '../../../models/cacheable';
import {helpers} from './../tree-item-custom-attribute';
import {makeFakeInstance} from '../../../../js_specs/spec_helpers';
import * as Utils from '../../../plugins/ggrc_utils';

describe('helpers.getCustomAttrValue', () => {
  let helper;
  let fakeInstance;
  let fakeOptions;
  let origValue;
  let actual;

  beforeAll(() => {
    helper = helpers.getCustomAttrValue;
    origValue = GGRC.custom_attr_defs;
  });

  afterAll(() => {
    GGRC.custom_attr_defs = origValue;
  });

  beforeEach(() => {
    fakeOptions = {};

    const fakeCustomAttrDefs = [{
      definition_type: 'control',
      id: 3,
      attribute_type: '',
      title: 'Type',
    },
    {
      definition_type: 'control',
      title: 'CheckBox',
      attribute_type: 'Checkbox',
      id: 4,
    },
    {
      definition_type: 'control',
      title: 'Start Date',
      attribute_type: 'Date',
      id: 5,
    },
    {
      definition_type: 'control',
      title: 'Text',
      attribute_type: 'Text',
      id: 6,
    },
    {
      definition_type: 'control',
      title: 'Rich Text',
      attribute_type: 'Rich Text',
      id: 7,
    },
    {
      definition_type: 'control',
      title: 'Persons',
      attribute_type: 'Map:Person',
      id: 8,
    },
    {
      definition_type: 'control',
      title: 'Date',
      attribute_type: 'Date',
      id: 9,
    },
    {
      definition_type: 'control',
      title: 'Dropdown',
      attribute_type: 'Dropdown',
      id: 10,
    }];
    fakeInstance = makeFakeInstance({
      model: Cacheable,
      staticProps: {
        is_custom_attributable: true,
      },
    })({
      custom_attribute_definitions: fakeCustomAttrDefs,
    });
    GGRC.custom_attr_defs = fakeCustomAttrDefs;
  });

  it('return correct value if there is ca value with certain caId',
    function () {
      const caId = 3;
      const value = 'correctValue';
      fakeInstance.customAttr(caId, value);
      actual = helper(fakeInstance, caId, fakeOptions);
      expect(actual).toBe(value);
    });

  describe('return an empty string', () => {
    it('if ca value is empty', function () {
      const caId = 3;
      fakeInstance.customAttr(caId, null);
      actual = helper(fakeInstance, caId, fakeOptions);
      expect(actual).toBe('');
    });

    it('if caObject was not found', function () {
      const caId = 10000;
      actual = helper(fakeInstance, caId, fakeOptions);
      expect(actual).toBe('');
    });
  });

  describe('for caObject of Checkbox type', () => {
    it('returns "Yes" if ca value is true',
      function () {
        const caId = 4;
        fakeInstance.customAttr(caId, true);
        actual = helper(fakeInstance, caId, fakeOptions);
        expect(actual).toEqual('Yes');
      });

    it('returns "No" if ca value is false',
      function () {
        const caId = 4;
        fakeInstance.customAttr(caId, false);
        actual = helper(fakeInstance, caId, fakeOptions);
        expect(actual).toEqual('No');
      });
  });

  describe('for caObject of Date type', () => {
    it('returns formatted date when CAD was found', function () {
      const caId = 9;
      const expected = 'expected date';
      const attrValue = '2017-09-30';
      spyOn(Utils, 'formatDate')
        .and.returnValue(expected);

      fakeInstance.customAttr(caId, attrValue);
      actual = helper(fakeInstance, caId, fakeOptions);

      expect(actual).toBe(expected);
      expect(Utils.formatDate)
        .toHaveBeenCalledWith(attrValue, true);
    });
  });

  describe('for caObject of Dropdown type', () => {
    it('returns caObject value', function () {
      const caId = 10;
      const value = 'Choice 1';
      fakeInstance.customAttr(caId, value);
      actual = helper(fakeInstance, caId, fakeOptions);
      expect(actual).toBe(value);
    });
  });

  describe('for caObject of Text type', () => {
    it('returns caObject value', function () {
      const caId = 6;
      const value = 'Some text';
      fakeInstance.customAttr(caId, value);
      actual = helper(fakeInstance, caId, fakeOptions);
      expect(actual).toBe(value);
    });
  });

  describe('for caObject of Rich Text type', () => {
    it('returns caObject value', function () {
      const caId = 7;
      const value = '<strong>some text</strong>';
      fakeInstance.customAttr(caId, value);
      actual = helper(fakeInstance, caId, fakeOptions);
      expect(actual).toBe(value);
    });
  });
});
