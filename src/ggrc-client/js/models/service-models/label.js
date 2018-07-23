/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Cacheable from '../cacheable';

export default Cacheable('CMS.Models.Label', {
  root_object: 'label',
  root_collection: 'labels',
  title_singular: 'Label',
  title_plural: 'Labels',
  findOne: 'GET /api/labels/{id}',
  findAll: 'GET /api/labels',
  update: 'PUT /api/labels/{id}',
  destroy: 'DELETE /api/labels/{id}',
  create: 'POST /api/labels',
}, {});
