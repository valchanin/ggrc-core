/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import Cacheable from '../cacheable';
import {getRole} from '../../plugins/utils/acl-utils';
import '../mixins/access-control-list';
import '../mixins/unique-title';
import '../mixins/ca-update';
import '../mixins/timeboxed';
import '../mixins/mapping-limit';
import '../mixins/issue-tracker.js';

export default Cacheable('CMS.Models.Audit', {
  root_object: 'audit',
  root_collection: 'audits',
  category: 'programs',
  findAll: 'GET /api/audits',
  findOne: 'GET /api/audits/{id}',
  update: 'PUT /api/audits/{id}',
  destroy: 'DELETE /api/audits/{id}',
  create: 'POST /api/audits',
  mixins: [
    'accessControlList',
    'unique_title',
    'ca_update',
    'timeboxed',
    'mapping-limit',
    'issueTracker',
  ],
  is_custom_attributable: true,
  is_clonable: true,
  isRoleable: true,
  attributes: {
    context: 'CMS.Models.Context.stub',
    program: 'CMS.Models.Program.stub',
    modified_by: 'CMS.Models.Person.stub',
    report_start_date: 'date',
    report_end_date: 'date',
    object_people: 'CMS.Models.ObjectPerson.stubs',
    people: 'CMS.Models.Person.stubs',
    audit_firm: 'CMS.Models.OrgGroup.stub',
  },
  defaults: {
    status: 'Planned',
  },
  statuses: ['Planned', 'In Progress', 'Manager Review',
    'Ready for External Review', 'Completed', 'Deprecated'],
  obj_nav_options: {
    show_all_tabs: false,
    force_show_list: ['In Scope Controls', 'Assessment Templates',
      'Issues', 'Assessments', 'Evidence'],
  },
  tree_view_options: {
    attr_view: GGRC.mustache_path + '/audits/tree-item-attr.mustache',
    attr_list: [{
      attr_title: 'Title',
      attr_name: 'title',
      order: 1,
    }, {
      attr_title: 'Code',
      attr_name: 'slug',
      order: 3,
    }, {
      attr_title: 'State',
      attr_name: 'status',
      order: 4,
    }, {
      attr_title: 'Last Updated Date',
      attr_name: 'updated_at',
      order: 5,
    }, {
      attr_title: 'Last Updated By',
      attr_name: 'modified_by',
      order: 6,
    }, {
      attr_title: 'Planned Start Date',
      attr_name: 'start_date',
      order: 7,
    }, {
      attr_title: 'Planned End Date',
      attr_name: 'end_date',
      order: 8,
    }, {
      attr_title: 'Last Deprecated Date',
      attr_name: 'last_deprecated_date',
      order: 9,
    }, {
      attr_title: 'Planned Report Period to',
      attr_name: 'report_period',
      attr_sort_field: 'report_end_date',
      order: 10,
    }, {
      attr_title: 'Audit Firm',
      attr_name: 'audit_firm',
      order: 11,
    }, {
      attr_title: 'Archived',
      attr_name: 'archived',
      order: 12,
    }, {
      attr_title: 'Description',
      attr_name: 'description',
      disable_sorting: true,
      order: 13,
    }],
    draw_children: true,
  },
  sub_tree_view_options: {
    default_filter: ['Product'],
  },
  init: function () {
    if (this._super) {
      this._super(...arguments);
    }
    this.validatePresenceOf('program');
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
  },
  buildIssueTrackerConfig() {
    return {
      hotlist_id: '766459',
      component_id: '188208',
      issue_severity: 'S2',
      issue_priority: 'P2',
      issue_type: 'PROCESS',
      enabled: false,
    };
  },
}, {
  object_model: function () {
    return CMS.Models[this.attr('object_type')];
  },
  clone: function (options) {
    let model = CMS.Models.Audit;
    return new model({
      operation: 'clone',
      cloneOptions: options.cloneOptions,
      program: this.program,
      title: this.title + new Date(),
    });
  },
  save: function () {
    // Make sure the context is always set to the parent program
    let _super = this._super;
    let args = arguments;
    if (!this.context || !this.context.id) {
      return this.program.reify().refresh().then(function (program) {
        this.attr('context', program.context);
        return _super.apply(this, args);
      }.bind(this));
    }
    return _super.apply(this, args);
  },
  findRoles: function (roleName) {
    const auditRole = getRole('Audit', roleName);

    return new can.List(this.access_control_list.filter((item) => {
      return item.ac_role_id === auditRole.id;
    }));
  },
});
