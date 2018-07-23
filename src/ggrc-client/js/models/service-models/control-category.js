/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Cacheable from '../cacheable';

export default Cacheable('CMS.Models.ControlCategory', {
  root_object: 'control_category',
  root_collection: 'control_categories',
  findAll: 'GET /api/control_categories',
  findOne: 'GET /api/control_categories/{id}',
  tree_view_options: {
    show_view: '/static/mustache/controls/categories_tree.mustache',
    start_expanded: false,
  },
}, {});
