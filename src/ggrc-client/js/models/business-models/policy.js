/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Cacheable from '../cacheable';
import Directive from './directive';

export default Directive('CMS.Models.Policy', {
  root_object: 'policy',
  root_collection: 'policies',
  model_plural: 'Policies',
  table_plural: 'policies',
  title_plural: 'Policies',
  model_singular: 'Policy',
  title_singular: 'Policy',
  table_singular: 'policy',
  findAll: 'GET /api/policies',
  findOne: 'GET /api/policies/{id}',
  create: 'POST /api/policies',
  update: 'PUT /api/policies/{id}',
  destroy: 'DELETE /api/policies/{id}',
  tree_view_options: {},
  is_custom_attributable: true,
  isRoleable: true,
  attributes: {},
  mixins: ['accessControlList'],
  meta_kinds: [
    'Company Policy',
    'Org Group Policy',
    'Data Asset Policy',
    'Product Policy',
    'Contract-Related Policy',
    'Company Controls Policy',
  ],
  cache: can.getObject('cache', Directive, true),
  sub_tree_view_options: {
    default_filter: ['DataAsset'],
  },
  defaults: {
    status: 'Draft',
    kind: null,
  },
  statuses: ['Draft', 'Deprecated', 'Active'],
  init: function () {
    can.extend(this.attributes, Directive.attributes);
    can.extend(this.tree_view_options, Directive.tree_view_options);
    this.tree_view_options.attr_list = Cacheable.attr_list.concat([
      {
        attr_title: 'Kind/Type',
        attr_name: 'kind',
        attr_sort_field: 'kind',
      },
      {attr_title: 'Effective Date', attr_name: 'start_date'},
      {attr_title: 'Last Deprecated Date', attr_name: 'end_date'},
      {attr_title: 'Reference URL', attr_name: 'reference_url'},
      {
        attr_title: 'Description',
        attr_name: 'description',
        disable_sorting: true,
      }, {
        attr_title: 'Notes',
        attr_name: 'notes',
        disable_sorting: true,
      }, {
        attr_title: 'Assessment Procedure',
        attr_name: 'test_plan',
        disable_sorting: true,
      }]);
    this._super(...arguments);
  },
}, {});
