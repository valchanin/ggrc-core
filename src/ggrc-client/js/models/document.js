/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

(function (ns, can) {
  function getAccessControlList() {
    let adminRole;
    adminRole = _.filter(GGRC.access_control_roles, {
      object_type: 'Document',
      name: 'Admin',
    });
    if (!adminRole || adminRole.length < 1) {
      console.warn('Document Admin custom role not found.');
      return;
    }
    return [{
      ac_role_id: adminRole[0].id,
      person: {type: 'Person', id: GGRC.current_user.id},
    }];
  }
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
    EVIDENCE: 'EVIDENCE',
    URL: 'URL',
    REFERENCE_URL: 'REFERENCE_URL',
    search: function (request, response) {
      return $.ajax({
        type: 'get',
        url: '/api/documents',
        dataType: 'json',
        data: {s: request.term},
        success: function (data) {
          response($.map(data, function (item) {
            return can.extend({}, item.document, {
              label: item.document.title ?
                     item.document.title + (
                        item.document.link_url ?
                        ' (' + item.document.link_url + ')' : '') :
                     item.document.link_url,
              value: item.document.id,
            });
          }));
        },
      });
    },
    attributes: {
      context: 'CMS.Models.Context.stub',
      kind: 'CMS.Models.Option.stub',
      year: 'CMS.Models.Option.stub',
    },
    defaults: {
      document_type: 'EVIDENCE',
      access_control_list: getAccessControlList(),
    },
    tree_view_options: {
      show_view: GGRC.mustache_path + '/documents/tree.mustache',
      display_attr_names: ['title', 'status', 'updated_at', 'document_type'],
      attr_list: [
        {attr_title: 'Title', attr_name: 'title'},
        {attr_title: 'State', attr_name: 'status'},
        {attr_title: 'Last Updated', attr_name: 'updated_at'},
        {attr_title: 'Type', attr_name: 'document_type'},
      ],
    },
    init: function () {
      this.validateNonBlank('link');
      this._super.apply(this, arguments);
    },
  }, {
    display_type: function () {
      if (_.isEmpty(this.object_documents)) {
        return 'URL';
      }
      return 'Evidence';
    },
  });
})(this, can);
