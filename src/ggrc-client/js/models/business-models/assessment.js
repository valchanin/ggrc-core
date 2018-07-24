/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import Cacheable from '../cacheable';
import {prepareCustomAttributes} from '../../plugins/utils/ca-utils';
import {getRole} from '../../plugins/utils/acl-utils';
import {sortByName} from '../../plugins/utils/label-utils';
import tracker from '../../tracker';
import {getPageInstance} from '../../plugins/utils/current-page-utils';
import '../mixins/unique-title';
import '../mixins/ca-update';
import '../mixins/auto-status-changeable';
import '../mixins/timeboxed';
import '../mixins/mapping-limit';
import '../mixins/in-scope-objects';
import '../mixins/access-control-list';
import '../mixins/refetch-hash';
import '../mixins/assessment-issue-tracker';
import '../mixins/related-assessments-loader';

export default Cacheable('CMS.Models.Assessment', {
  root_object: 'assessment',
  root_collection: 'assessments',
  category: 'governance',
  findOne: 'GET /api/assessments/{id}',
  findAll: 'GET /api/assessments',
  update: 'PUT /api/assessments/{id}',
  destroy: 'DELETE /api/assessments/{id}',
  create: 'POST /api/assessments',
  mixins: [
    'unique_title', 'ca_update',
    'autoStatusChangeable', 'timeboxed', 'mapping-limit',
    'inScopeObjects', 'accessControlList', 'refetchHash',
    'assessmentIssueTracker', 'relatedAssessmentsLoader',
  ],
  is_custom_attributable: true,
  isRoleable: true,
  defaults: {
    test_plan_procedure: true,
    assessment_type: 'Control',
    status: 'Not Started',
    send_by_default: true, // notifications when a comment is added
    recipients: 'Assignees,Creators,Verifiers', // user roles to be notified
  },
  statuses: ['Not Started', 'In Progress', 'In Review',
    'Verified', 'Completed', 'Deprecated', 'Rework Needed'],
  tree_view_options: {
    add_item_view: GGRC.mustache_path +
    '/base_objects/tree_add_item.mustache',
    attr_view: GGRC.mustache_path + '/base_objects/tree-item-attr.mustache',
    attr_list: [{
      attr_title: 'Title',
      attr_name: 'title',
      order: 1,
    }, {
      attr_title: 'State',
      attr_name: 'status',
      order: 2,
    }, {
      attr_title: 'Label',
      attr_name: 'label',
      order: 3,
    }, {
      attr_title: 'Verified',
      attr_name: 'verified',
      order: 4,
    }, {
      attr_title: 'Code',
      attr_name: 'slug',
      order: 5,
    }, {
      attr_title: 'Due Date',
      attr_name: 'start_date',
      order: 6,
    }, {
      attr_title: 'Created Date',
      attr_name: 'created_at',
      order: 7,
    }, {
      attr_title: 'Last Updated Date',
      attr_name: 'updated_at',
      order: 8,
    }, {
      attr_title: 'Last Updated By',
      attr_name: 'modified_by',
      order: 9,
    }, {
      attr_title: 'Verified Date',
      attr_name: 'verified_date',
      order: 10,
    }, {
      attr_title: 'Finished Date',
      attr_name: 'finished_date',
      order: 11,
    }, {
      attr_title: 'Last Deprecated Date',
      attr_name: 'end_date',
      order: 12,
    }, {
      attr_title: 'Conclusion: Design',
      attr_name: 'design',
      order: 13,
    }, {
      attr_title: 'Conclusion: Operation',
      attr_name: 'operationally',
      order: 14,
    }, {
      attr_title: 'Archived',
      attr_name: 'archived',
      order: 15,
    }, {
      attr_title: 'Ticket Tracker',
      attr_name: 'issue_url',
      order: 16,
      deny: !GGRC.ISSUE_TRACKER_ENABLED,
    }, {
      attr_title: 'Last Comment',
      attr_name: 'last_comment',
      order: 17,
    }, {
      attr_title: 'Description',
      attr_name: 'description',
      order: 18,
    }, {
      attr_title: 'Notes',
      attr_name: 'notes',
      disable_sorting: true,
      order: 19,
    }, {
      attr_title: 'Assessment Procedure',
      attr_name: 'test_plan',
      disable_sorting: true,
      order: 20,
    }],
    display_attr_names: ['title', 'status', 'label', 'Assignees', 'Verifiers',
      'start_date', 'updated_at'],
  },
  sub_tree_view_options: {
    default_filter: ['Control'],
  },
  confirmEditModal: {
    title: 'Confirm moving Assessment to "In Progress"',
    description: 'You are about to move Assessment from ' +
    '"{{status}}" to "In Progress" - are you sure about that?',
    button: 'Confirm',
  },
  conclusions: ['Effective', 'Ineffective', 'Needs improvement',
    'Not Applicable'],
  init: function () {
    if (this._super) {
      this._super(...arguments);
    }
    this.validatePresenceOf('audit');
    this.validateNonBlank('title');


    this.validate(
      'issue_tracker_title',
      function () {
        if (this.attr('can_use_issue_tracker') &&
          this.attr('issue_tracker.enabled') &&
          !this.attr('issue_tracker.title')) {
          return 'cannot be blank';
        }
      }
    );
    this.validate(
      'issue_tracker_component_id',
      function () {
        if (this.attr('can_use_issue_tracker') &&
          this.attr('issue_tracker.enabled') &&
          !this.attr('issue_tracker.component_id')) {
          return 'cannot be blank';
        }
      }
    );
    this.validate(
      '_gca_valid',
      function () {
        if (!this._gca_valid) {
          return 'Missing required global custom attribute';
        }
      }
    );
  },
  prepareAttributes: function (attrs) {
    return attrs[this.root_object] ? attrs[this.root_object] : attrs;
  },
  /**
   * Assessment specific AJAX data parsing logic
   * @param {Object} attributes - hash of Model key->values
   * @return {Object} - parsed object with normalized data
   */
  parseModel: function (attributes) {
    let values;
    let definitions;
    attributes = this.prepareAttributes(attributes);
    values = attributes.custom_attribute_values || [];
    definitions = attributes.custom_attribute_definitions || [];

    if (!definitions.length) {
      return attributes;
    }

    if (attributes.labels && attributes.labels.length) {
      attributes.labels = sortByName(attributes.labels);
    }

    attributes.custom_attribute_values =
      prepareCustomAttributes(definitions, values);
    return attributes;
  },
  model: function (attributes, oldModel) {
    let model;
    let id;
    let backup;
    if (!attributes) {
      return;
    }

    if (typeof attributes.serialize === 'function') {
      attributes = attributes.serialize();
    } else {
      attributes = this.parseModel(attributes);
    }

    id = attributes[this.id];
    if ((id || id === 0) && this.store[id]) {
      oldModel = this.store[id];
    }

    model = oldModel && can.isFunction(oldModel.attr) ?
      oldModel.attr(attributes) :
      new this(attributes);

    // Sometimes we are updating model partially and asynchronous
    // for example when we load relationships.
    // In this case we have to update backup to solve isDirty issues.
    backup = model._backupStore();
    if (backup) {
      _.extend(backup, attributes);
    }

    // This is a temporary solution
    if (attributes.documents) {
      model.attr('documents', attributes.documents, true);
    }

    return model;
  },
  /**
   * Replace Cacheble#findInCacheById method with the latest feature of can.Model - store
   * @param {String} id - Id of requested Model
   * @return {CMS.Models.Assessment} - already existing model
   */
  findInCacheById: function (id) {
    return this.store[id];
  },
}, {
  init: function () {
    if (this._super) {
      this._super(...arguments);
    }
    this.bind('refreshInstance', this.refresh.bind(this));
  },
  before_create: function () {
    if (!this.audit) {
      throw new Error('Cannot save assessment, audit not set.');
    } else if (!this.audit.context) {
      throw new Error(
        'Cannot save assessment, audit context not set.');
    }
    this.attr('context', this.attr('audit.context'));
    this.attr('design', '');
    this.attr('operationally', '');
  },
  _transformBackupProperty: function (badProperties) {
    let backupInstance = this._backupStore();
    if (!backupInstance) {
      return;
    }
    badProperties.forEach(function (property) {
      if (!this[property] && !backupInstance[property] &&
      (this[property] !== backupInstance[property])) {
        backupInstance[property] = this[property];
      }
    }.bind(this));

    if (this.validate_assessor !== undefined) {
      backupInstance.validate_assessor = this.validate_assessor;
    }
    if (this.validate_creator !== undefined) {
      backupInstance.validate_creator = this.validate_creator;
    }
  },
  isDirty: function (checkAssociations) {
    this._transformBackupProperty(['design', 'operationally', '_disabled']);
    return this._super(checkAssociations);
  },
  form_preload: function (newObjectForm) {
    let pageInstance = getPageInstance();
    let currentUser = CMS.Models.get_instance('Person',
      GGRC.current_user.id, GGRC.current_user);

    if (pageInstance && (!this.audit || !this.audit.id || !this.audit.type)) {
      if (pageInstance.type === 'Audit') {
        this.attr('audit', pageInstance);
      }
    }

    if (!newObjectForm) {
      return;
    }

    // Make sure before create is called before save
    this.before_create();

    if (this.audit) {
      const auditors = this.audit.findRoles('Auditors');
      const auditCaptains = this.audit.findRoles('Audit Captains');

      markForAddition(this, currentUser, 'Creators');
      if (!auditCaptains.length) {
        markForAddition(this, currentUser, 'Assignees');
      }
      auditCaptains.forEach((item) => {
        markForAddition(this, item.person, 'Assignees');
      });
      auditors.forEach((item) => {
        markForAddition(this, item.person, 'Verifiers');
      });
    }

    function markForAddition(instance, user, type) {
      let rolesNames = type.split(',');
      let acl = instance.attr('access_control_list');

      rolesNames.forEach((roleName) => {
        let role = getRole('Assessment', roleName);

        if (role) {
          acl.push({
            ac_role_id: role.id,
            person: {
              id: user.id,
            },
            person_id: user.id,
          });
        }
      });
    }
  },
  refresh: function () {
    let dfd;
    let href = this.selfLink || this.href;
    let that = this;

    if (!href) {
      return can.Deferred().reject();
    }
    if (!this._pending_refresh) {
      this._pending_refresh = {
        dfd: can.Deferred(),
        fn: _.throttle(function () {
          let dfd = that._pending_refresh.dfd;
          can.ajax({
            url: href,
            type: 'get',
            dataType: 'json',
          })
            .then($.proxy(that, 'cleanupAcl'))
            .then(function (model) {
              delete that._pending_refresh;
              if (model) {
                model = CMS.Models.Assessment.model(model, that);
                model.backup();
                return model;
              }
            })
            .done(function () {
              dfd.resolve(...arguments);
            })
            .fail(function () {
              dfd.reject(...arguments);
            });
        }, 300, {trailing: false}),
      };
    }
    dfd = this._pending_refresh.dfd;
    this._pending_refresh.fn();
    return dfd;
  },
  getRelatedObjects() {
    const stopFn = tracker.start(
      this.type,
      tracker.USER_JOURNEY_KEYS.API,
      tracker.USER_ACTIONS.ASSESSMENT.RELATED_OBJECTS);

    return $.get(`/api/assessments/${this.attr('id')}/related_objects`)
      .then((response) => {
        let auditTitle = response.Audit.title;

        stopFn();

        if (this.attr('audit')) {
          this.attr('audit.title', auditTitle);
        }

        return response;
      }, stopFn.bind(null, true));
  },
});

