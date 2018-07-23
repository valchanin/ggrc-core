/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Cacheable from '../cacheable';

export default Cacheable('CMS.Models.BackgroundTask', {
  root_object: 'background_task',
  root_collection: 'background_tasks',
  findAll: 'GET /api/background_tasks',
  findOne: 'GET /api/background_tasks/{id}',
  update: 'PUT /api/background_tasks/{id}',
  destroy: 'DELETE /api/background_tasks/{id}',
  create: 'POST /api/background_tasks',
  scopes: [],
  defaults: {},
}, {
  poll: function () {
    let dfd = new $.Deferred();
    let self = this;
    let wait = 2000;

    function _poll() {
      self.refresh().then(function (task) {
        // Poll until we either get a success or a failure:
        if (['Success', 'Failure'].indexOf(task.status) < 0) {
          setTimeout(_poll, wait);
        } else {
          dfd.resolve(task);
        }
      });
    }
    _poll();
    return dfd;
  },
});
