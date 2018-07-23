/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Cacheable from '../cacheable';
import {getRole} from '../../plugins/utils/acl-utils';
import {backendGdriveClient} from '../../plugins/ggrc-gapi-client';

const getAccessControlList = ()=> {
  let adminRole = getRole('Document', 'Admin');

  return adminRole ? [{
    ac_role_id: adminRole.id,
    person: {type: 'Person', id: GGRC.current_user.id},
  }] : [];
};

export default Cacheable('CMS.Models.Document', {
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
    'ca_update',
  ],
  statuses: [
    'Active',
    'Deprecated',
  ],
  kinds: [
    {title: 'File', value: 'FILE'},
    {title: 'Reference URL', value: 'REFERENCE_URL'},
  ],
  attributes: {
    context: 'CMS.Models.Context.stub',
  },
  isRoleable: true,
  defaults: {
    kind: 'FILE',
    access_control_list: getAccessControlList(),
    status: 'Active',
    send_by_default: true,
    recipients: 'Admin',
  },
  tree_view_options: {
    attr_view: GGRC.mustache_path + '/documents/tree-item-attr.mustache',
    display_attr_names: ['title', 'status', 'updated_at', 'document_type'],
    attr_list: [
      {attr_title: 'Title', attr_name: 'title'},
      {attr_title: 'Code', attr_name: 'slug'},
      {attr_title: 'State', attr_name: 'status'},
      {attr_title: 'Type', attr_name: 'kind'},
      {attr_title: 'Last Updated By', attr_name: 'modified_by'},
      {attr_title: 'Last Updated Date', attr_name: 'updated_at'},
      {attr_title: 'Last Deprecated Date', attr_name: 'last_deprecated_date'},
      {
        attr_title: 'Description',
        attr_name: 'description',
        disable_sorting: true,
      }],
    add_item_view: GGRC.mustache_path + '/base_objects/tree_add_item.mustache',
  },
  init: function () {
    this.validateNonBlank('title');
    this._super(...arguments);
  },
}, {
  kindTitle() {
    let value = this.attr('kind');
    let title = _.findWhere(this.class.kinds, {value}).title;
    return title;
  },
  save() {
    let baseSave = this._super;
    return backendGdriveClient.withAuth(()=> {
      return baseSave.call(this);
    });
  },
});
