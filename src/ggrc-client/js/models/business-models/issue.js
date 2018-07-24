/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Cacheable from '../cacheable';
import '../mixins/ca-update';
import '../mixins/timeboxed';
import '../mixins/in-scope-objects';
import '../mixins/in-scope-objects-preload';
import '../mixins/access-control-list';
import '../mixins/base-notifications';
import '../mixins/issue-tracker';

export default Cacheable('CMS.Models.Issue', {
  root_object: 'issue',
  root_collection: 'issues',
  category: 'governance',
  findOne: 'GET /api/issues/{id}',
  findAll: 'GET /api/issues',
  update: 'PUT /api/issues/{id}',
  destroy: 'DELETE /api/issues/{id}',
  create: 'POST /api/issues',
  mixins: [
    'ca_update',
    'timeboxed',
    'inScopeObjects',
    'inScopeObjectsPreload',
    'accessControlList',
    'base-notifications',
    'issueTracker',
  ],
  is_custom_attributable: true,
  isRoleable: true,
  attributes: {
    context: 'CMS.Models.Context.stub',
  },
  tree_view_options: {
    attr_list: Cacheable.attr_list.concat([
      {attr_title: 'Reference URL', attr_name: 'reference_url'},
      {attr_title: 'Last Deprecated Date', attr_name: 'end_date'},
      {
        attr_title: 'Ticket Tracker',
        attr_name: 'issue_url',
        deny: !GGRC.ISSUE_TRACKER_ENABLED,
      },
      {
        attr_title: 'Description',
        attr_name: 'description',
        disable_sorting: true,
      }, {
        attr_title: 'Notes',
        attr_name: 'notes',
        disable_sorting: true,
      }, {
        attr_title: 'Remediation Plan',
        attr_name: 'test_plan',
        disable_sorting: true,
      }]),
    attr_view: GGRC.mustache_path + '/base_objects/tree-item-attr.mustache',
    add_item_view: GGRC.mustache_path + '/issues/tree_add_item.mustache',
    display_attr_names: ['title', 'Admin', 'status', 'updated_at'],
  },
  sub_tree_view_options: {
    default_filter: ['Control', 'Control_versions'],
  },
  defaults: {
    status: 'Draft',
  },
  statuses: ['Draft', 'Deprecated', 'Active', 'Fixed', 'Fixed and Verified'],
  getAllowedMappings() {
    return _.union(
      GGRC.config.snapshotable_objects,
      ['Issue', 'Program', 'Project', 'TaskGroup', 'Document']
    );
  },
  buildIssueTrackerConfig(instance) {
    return {
      hotlist_id: '864697',
      component_id: '188208',
      issue_severity: 'S2',
      issue_priority: 'P2',
      issue_type: 'PROCESS',
      title: instance.title || '',
      enabled: instance.isNew(),
    };
  },
  init: function () {
    if (this._super) {
      this._super(...arguments);
    }
    this.validateNonBlank('title');

    this.validate(
      'issue_tracker_component_id',
      function () {
        if (this.attr('issue_tracker.enabled') &&
          !this.attr('issue_tracker.component_id')) {
          return 'cannot be blank';
        }
      }
    );
    this.validate(
      'issue_tracker_title',
      function () {
        if (this.attr('issue_tracker.enabled') &&
          !this.attr('issue_tracker.title')) {
          return 'cannot be blank';
        }
      }
    );
  },
}, {
  object_model: function () {
    return CMS.Models[this.attr('object_type')];
  },
});
