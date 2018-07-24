/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import Cacheable from '../cacheable';
import {getPageInstance} from '../../plugins/utils/current-page-utils';
import '../mixins/mapping-limit';
import '../mixins/in-scope-objects';
import '../mixins/in-scope-objects-preload';
import '../mixins/refetch-hash';
import '../mixins/assessment-issue-tracker';

/**
 * A model describing a template for the newly created Assessment objects.
 *
 * This is useful when creating multiple similar Assessment objects. Using an
 * AssessmentTemplate helps avoiding repeatedly defining the same set of
 * Assessment object properties for each new instance.
 */
export default Cacheable('CMS.Models.AssessmentTemplate', {
  root_object: 'assessment_template',
  root_collection: 'assessment_templates',
  model_singular: 'AssessmentTemplate',
  model_plural: 'AssessmentTemplates',
  title_singular: 'Assessment Template',
  title_plural: 'Assessment Templates',
  table_singular: 'assessment_template',
  table_plural: 'assessment_templates',
  mixins: [
    'mapping-limit',
    'inScopeObjects',
    'inScopeObjectsPreload',
    'refetchHash',
    'assessmentIssueTracker',
  ],
  findOne: 'GET /api/assessment_templates/{id}',
  findAll: 'GET /api/assessment_templates',
  update: 'PUT /api/assessment_templates/{id}',
  destroy: 'DELETE /api/assessment_templates/{id}',
  create: 'POST /api/assessment_templates',
  is_custom_attributable: false,
  attributes: {
    context: 'CMS.Models.Context.stub',
  },
  defaults: {
    test_plan_procedure: true,
    template_object_type: 'Control',
    default_people: {
      assignees: 'Principal Assignees',
      verifiers: 'Auditors',
    },
    status: 'Draft',
    // the custom lists of assignee / verifier IDs if "other" is selected for
    // the corresponding default_people setting
    assigneesList: {},
    verifiersList: {},
    people_values: [
      {value: 'Admin', title: 'Object Admins'},
      {value: 'Audit Lead', title: 'Audit Captain'},
      {value: 'Auditors', title: 'Auditors'},
      {value: 'Principal Assignees', title: 'Principal Assignees'},
      {value: 'Secondary Assignees', title: 'Secondary Assignees'},
      {value: 'Primary Contacts', title: 'Primary Contacts'},
      {value: 'Secondary Contacts', title: 'Secondary Contacts'},
      {value: 'other', title: 'Others...'},
    ],
    showCaptainAlert: false,
  },
  statuses: ['Draft', 'Deprecated', 'Active'],
  tree_view_options: {
    attr_view: GGRC.mustache_path + '/base_objects/tree-item-attr.mustache',
  },

  /**
   * Initialize the newly created object instance. Validate that its title is
   * non-blank and its default assignees / verifiers lists are set if
   * applicable.
   */
  init: function () {
    this._super(...arguments);
    this.validateNonBlank('title');
    this.validateNonBlank('default_people.assignees');

    this.validateListNonBlank(
      'assigneesList',
      function () {
        return this.attr('default_people.assignees') === 'other';
      }
    );
    this.validateListNonBlank(
      'verifiersList',
      function () {
        return this.attr('default_people.verifiers') === 'other';
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
  },
}, {
  /**
   * An event handler when the add/edit form is about to be displayed.
   *
   * It builds a list of all object types used to populate the corresponding
   * dropdown menu on the form.
   * It also deserializes the default people settings so that those form
   * fields are correctly populated.
   *
   * @param {Boolean} isNewObject - true if creating a new instance, false if
   *   editing and existing one
   *
   */
  form_preload: function (isNewObject) {
    const pageInstance = getPageInstance();
    if (pageInstance && (!this.audit || !this.audit.id || !this.audit.type)) {
      if (pageInstance.type === 'Audit') {
        this.attr('audit', pageInstance);
      }
    }


    if (!this.custom_attribute_definitions) {
      this.attr('custom_attribute_definitions', new can.List());
    }
    this._unpackPeopleData();

    this._updateDropdownEnabled('assignees');
    this._updateDropdownEnabled('verifiers');
  },

  /**
   * Save the model instance by sending a POST/PUT request to the server
   *
   * @return {can.Deferred} - a deferred object resolved or rejected
   *   depending on the outcome of the undrelying API request
   */
  save: function () {
    this.attr('default_people', this._packPeopleData());

    return this._super(...arguments);
  },

  /**
   * Event handler when an assignee is picked in an autocomplete form field.
   * It adds the picked assignee's ID to the assignees list.
   *
   * @param {can.Map} context - the Mustache context of the `$el`
   * @param {jQuery.Element} $el - the source of the event `ev`
   * @param {jQuery.Event} ev - the event that was triggered
   */
  assigneeAdded: function (context, $el, ev) {
    let user = ev.selectedItem;
    this.assigneesList.attr(user.id, true);
  },

  /**
   * Removes user from assignees list
   *
   * @param {can.Map} user - user which should be removed
   */
  removeAssignee: function (user) {
    this.assigneesList.removeAttr(String(user.id));
  },

  /**
   * Event handler when a verifier is picked in an autocomplete form field.
   * It adds the picked verifier's ID to the verifiers list.
   *
   * @param {can.Map} context - the Mustache context of the `$el`
   * @param {jQuery.Element} $el - the source of the event `ev`
   * @param {jQuery.Event} ev - the event that was triggered
   */
  verifierAdded: function (context, $el, ev) {
    let user = ev.selectedItem;
    this.verifiersList.attr(user.id, true);
  },

  /**
   * Removes user from verifiers list
   *
   * @param {can.Map} user - user which should be removed
   */
  removeVerifier: function (user) {
    this.verifiersList.removeAttr(String(user.id));
  },

  /**
   * Event handler when a user changes the default assignees option.
   *
   * @param {can.Map} context - the Mustache context of the `$el`
   * @param {jQuery.Element} $el - the source of the event `ev`
   * @param {jQuery.Event} ev - the event that was triggered
   */
  defaultAssigneesChanged: function (context, $el, ev) {
    let changedList = [
      'Auditors', 'Principal Assignees', 'Secondary Assignees',
      'Primary Contacts', 'Secondary Contacts',
    ];
    this.attr('showCaptainAlert',
      changedList.indexOf(this.default_people.assignees) >= 0);
    this._updateDropdownEnabled('assignees');
  },

  /**
   * Event handler when a user changes the default verifiers option.
   *
   * @param {can.Map} context - the Mustache context of the `$el`
   * @param {jQuery.Element} $el - the source of the event `ev`
   * @param {jQuery.Event} ev - the event that was triggered
   */
  defaultVerifiersChanged: function (context, $el, ev) {
    this._updateDropdownEnabled('verifiers');
  },

  /**
   * Update the autocomplete field's disabled flag based on the current value
   * of the corresponding dropdown.
   *
   * @param {String} name - the value to inspect, must be either "assignees"
   *   or "verifiers"
   */
  _updateDropdownEnabled: function (name) {
    let disable = this.attr('default_people.' + name) !== 'other';
    this.attr(name + 'ListDisable', disable);
  },

  /**
   * Pack the "default people" form data into a JSON string.
   *
   * @return {String} - the JSON-packed default people data
   */
  _packPeopleData: function () {
    let data = {};

    /**
     * Create a sorted (ascending) list of numbers from the given map's keys.
     *
     * @param {can.Map} peopleIds - the map to convert
     * @return {Array} - ordered IDs
     */
    function makeList(peopleIds) {
      let result = Object.keys(peopleIds.attr()).map(Number);
      return result.sort(function (x, y) {
        return x - y;
      });
    }

    data.assignees = this.attr('default_people.assignees');
    data.verifiers = this.attr('default_people.verifiers');

    if (data.assignees === 'other') {
      data.assignees = makeList(this.attr('assigneesList'));
    }

    if (data.verifiers === 'other') {
      data.verifiers = makeList(this.attr('verifiersList'));
    }

    return data;
  },

  /**
   * Inspect the default people settings object, convert any lists of
   * user IDs to comma-separated strings, and use that to populate the
   * corresponding text input fields.
   */
  _unpackPeopleData: function () {
    let instance = this; // the AssessmentTemplate model instance
    let peopleData = instance.default_people;

    ['assignees', 'verifiers'].forEach(function (name) {
      let idsMap;
      let peopleIds = peopleData[name];

      if (peopleIds instanceof can.List) {
        idsMap = new can.Map();
        peopleIds.forEach(function (id) {
          idsMap.attr(id, true);
        });
        instance.attr(name + 'List', idsMap);
        instance.attr('default_people.' + name, 'other');
      } else {
        instance.attr(name + 'List', {});
      }
    });
  },
});
