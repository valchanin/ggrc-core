/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Directive from './directive';
import '../mixins/access-control-list';

export default Directive('CMS.Models.Contract', {
  root_object: 'contract',
  root_collection: 'contracts',
  model_plural: 'Contracts',
  table_plural: 'contracts',
  title_plural: 'Contracts',
  model_singular: 'Contract',
  title_singular: 'Contract',
  table_singular: 'contract',
  findAll: 'GET /api/contracts',
  findOne: 'GET /api/contracts/{id}',
  create: 'POST /api/contracts',
  update: 'PUT /api/contracts/{id}',
  destroy: 'DELETE /api/contracts/{id}',
  mixins: ['accessControlList'],
  is_custom_attributable: true,
  isRoleable: true,
  attributes: {
  },
  meta_kinds: ['Contract'],
  cache: can.getObject('cache', Directive, true),
  sub_tree_view_options: {
    default_filter: ['Clause'],
  },
  defaults: {
    status: 'Draft',
    kind: 'Contract',
  },
  statuses: ['Draft', 'Deprecated', 'Active'],
  init: function () {
    can.extend(this.attributes, Directive.attributes);
    this._super(...arguments);
  },
}, {});
