/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Cacheable from '../cacheable';

export default Cacheable('CMS.Models.Event', {
  root_object: 'event',
  root_collection: 'events',
  findAll: 'GET /api/events',
  list_view_options: {
    find_params: {
      __include: 'revisions',
    },
  },
  attributes: {
    modified_by: 'CMS.Models.Person.stub',
  },
}, {});
