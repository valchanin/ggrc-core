/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Cacheable from '../cacheable';

export default Cacheable('CMS.Models.CustomAttributeValue', {
  root_object: 'custom_attribute_value',
  root_collection: 'custom_attribute_values',
  category: 'custom_attribute_values',
  findAll: 'GET /api/custom_attribute_values',
  findOne: 'GET /api/custom_attribute_values/{id}',
  create: 'POST /api/custom_attribute_values',
  update: 'PUT /api/custom_attribute_values/{id}',
  destroy: 'DELETE /api/custom_attribute_values/{id}',
  mixins: [],
  attributes: {
    definition: 'CMS.Models.CustomAttributeDefinition.stub',
    modified_by: 'CMS.Models.Person.stub',
  },
  links_to: {},
  init: function () {
    this._super(...arguments);
  },
}, {
  init: function () {
    this._super(...arguments);
  },
});
