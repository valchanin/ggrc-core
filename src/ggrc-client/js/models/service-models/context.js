/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Cacheable from '../cacheable';

export default Cacheable('CMS.Models.Context', {
  root_object: 'context',
  root_collection: 'contexts',
  category: 'contexts',
  findAll: '/api/contexts',
  findOne: '/api/contexts/{id}',
  create: 'POST /api/contexts',
  update: 'PUT /api/contexts/{id}',
  destroy: 'DELETE /api/contexts/{id}',
  attributes: {
    context: 'CMS.Models.Context.stub',
    related_object: 'CMS.Models.get_stub',
    user_roles: 'CMS.Models.UserRole.stubs',
  },
}, {});
