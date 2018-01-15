/*
  Copyright (C) 2017 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

const getAccessControlList = ()=> {
  let adminRole = _.find(GGRC.access_control_roles, {
    object_type: 'Document',
    name: 'Admin',
  });
  return adminRole ? [{
    ac_role_id: adminRole.id,
    person: {type: 'Person', id: GGRC.current_user.id},
  }] : [];
};

can.Model.Cacheable('CMS.Models.Evidence', {
  root_object: 'evidence',
  root_collection: 'evidences',
  title_singular: 'Evidence',
  title_plural: 'Evidences',
  category: 'governance',
  findAll: 'GET /api/evidences',
  findOne: 'GET /api/evidences/{id}',
  create: 'POST /api/evidences',
  update: 'PUT /api/evidences/{id}',
  destroy: 'DELETE /api/evidences/{id}',
  mixins: [
    'accessControlList',
  ],
  attributes: {
    context: 'CMS.Models.Context.stub',
  },
  isRoleable: true,
  statuses: [
    'Active',
    'Deprecated',
  ],
  document_types: [
    'EVIDENCE',
    'URL',
    'REFERENCE_URL',
  ],
  defaults: {
    access_control_list: getAccessControlList(),
    document_type: 'EVIDENCE',
    status: 'Active',
  },
  tree_view_options: {
    attr_view: GGRC.mustache_path + '/evidences/tree-item-attr.mustache',
    display_attr_names: [
      'title',
      'status',
      'updated_at',
    ],
    attr_list: [
      {attr_title: 'Title', attr_name: 'title'},
      {attr_title: 'State', attr_name: 'status'},
      {attr_title: 'Type', attr_name: 'document_type'},
      {attr_title: 'Last Updated By', attr_name: 'modified_by'},
      {attr_title: 'Last Updated', attr_name: 'updated_at'},
      {attr_title: 'Last Deprecated Date', attr_name: 'end_date'},
      {attr_title: 'Archived', attr_name: 'archived'},
    ],
  },
  init: function () {
    this.validateNonBlank('title');
    this.validateNonBlank('link');
    this._super(...arguments);
  },
}, {});
