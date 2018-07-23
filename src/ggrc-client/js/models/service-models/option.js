/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Cacheable from '../cacheable';

export default Cacheable('CMS.Models.Option', {
  root_object: 'option',
  findAll: 'GET /api/options',
  findOne: 'GET /api/options/{id}',
  create: 'POST /api/options',
  update: 'PUT /api/options/{id}',
  destroy: 'DELETE /api/options/{id}',
  root_collection: 'options',
  cache_by_role: {},
  for_role: function (role) {
    let self = this;

    if (!this.cache_by_role[role]) {
      this.cache_by_role[role] =
        this.findAll({role: role}).then(function (options) {
          self.cache_by_role[role] = options;
          return options;
        });
    }
    return $.when(this.cache_by_role[role]);
  },
}, {});
