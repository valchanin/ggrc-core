/*
    Copyright (C) 2018 Google Inc.
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

can.Model.Cacheable('CMS.Models.Document', {
  root_object: 'document',
  root_collection: 'documents',
  title_singular: 'Document',
  title_plural: 'Documents',
  category: 'governance',
  findAll: 'GET /api/documents',
  findOne: 'GET /api/documents/{id}',
  create: 'POST /api/documents',
  update: 'PUT /api/documents/{id}',
  destroy: 'DELETE /api/documents/{id}',
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
    display_attr_names: ['title', 'status', 'updated_at', 'document_type'],
    attr_list: [
      {attr_title: 'Title', attr_name: 'title'},
      {attr_title: 'State', attr_name: 'status'},
      {attr_title: 'Last Updated', attr_name: 'updated_at'},
      {attr_title: 'Type', attr_name: 'document_type'},
    ],
  },
  init: function () {
    this.validateNonBlank('title');
    this.validateNonBlank('link');
    this._super(...arguments);
  },
}, {});
