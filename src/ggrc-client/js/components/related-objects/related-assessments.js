/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../sortable-column/sortable-column';
import '../object-list/object-list';
import '../object-list-item/business-object-list-item';
import '../object-list-item/document-object-list-item';
import '../object-popover/related-assessment-popover';
import '../reusable-objects/reusable-objects-item';
import '../state-colors-map/state-colors-map';
import '../spinner/spinner';
import '../tree_pagination/tree_pagination';
import Pagination from '../base-objects/pagination';
import template from './templates/related-assessments.mustache';
import {prepareCustomAttributes} from '../../plugins/utils/ca-utils';
import {backendGdriveClient} from '../../plugins/ggrc-gapi-client';

const defaultOrderBy = [
  {field: 'finished_date', direction: 'desc'},
  {field: 'created_at', direction: 'desc'},
];

export default can.Component.extend({
  tag: 'related-assessments',
  template,
  viewModel: {
    define: {
      unableToReuse: {
        get: function () {
          let hasItems = this.attr('selectedEvidences.length');
          let isSaving = this.attr('isSaving');

          return !hasItems || isSaving;
        },
      },
      relatedObjectType: {
        get: function () {
          // Get related object type based on assessment or the instance itself
          // 'instance.assessment_type' is used for object in "Related assessments" in
          // assessments info pane.
          // 'instance.type' is used when we are getting related assessment for
          // a snapshot.
          return this.attr('instance.assessment_type') ||
                 this.attr('instance.type');
        },
      },
      relatedObjectsTitle: {
        get: function () {
          const relObjType = this.attr('relatedObjectType');

          const objectName = CMS.Models[relObjType].model_plural;
          return `Related ${objectName}`;
        },
      },
      paging: {
        value: function () {
          return new Pagination({pageSizeSelect: [5, 10, 15]});
        },
      },
    },
    instance: {},
    selectedEvidences: [],
    orderBy: {},
    isSaving: false,
    loading: false,
    needReuse: false,
    relatedAssessments: [],
    buildEvidenceModel: function (evidence) {
      const baseData = {
        context: {id: this.attr('instance.context.id') || null},
        documentable_obj: {
          id: this.attr('instance.id'),
          type: this.attr('instance.type'),
        },
        document_type: evidence.attr('document_type'),
        title: evidence.attr('title'),
      };
      const specificData = evidence.attr('document_type') === 'EVIDENCE' ?
        {source_gdrive_id: evidence.attr('gdrive_id')} :
        {link: evidence.attr('link')};

      let data = Object.assign({}, baseData, specificData);

      return new CMS.Models.Document(data);
    },
    reuseSelected: function () {
      let reusedObjectList = this.attr('selectedEvidences').map((evidence)=> {
        let model = this.buildEvidenceModel(evidence);

        return backendGdriveClient.withAuth(()=> {
          return model.save();
        });
      });

      this.attr('isSaving', true);

      can.when(...reusedObjectList).always(()=> {
        this.attr('selectedEvidences').replace([]);
        this.attr('isSaving', false);
        this.dispatch('afterObjectReused');
        this.attr('instance').dispatch('refreshInstance');
      });
    },
    loadRelatedAssessments() {
      const limits = this.attr('paging.limits');
      const orderBy = this.attr('orderBy');
      let currentOrder = [];

      if (!orderBy.attr('field')) {
        currentOrder = defaultOrderBy;
      } else {
        currentOrder = [orderBy];
      }

      this.attr('loading', true);

      return this.attr('instance').getRelatedAssessments(limits, currentOrder)
        .then((response) => {
          const assessments = response.data.map((assessment) => {
            let values = assessment.custom_attribute_values || [];
            let definitions = assessment.custom_attribute_definitions || [];

            if (definitions.length) {
              assessment.custom_attribute_values =
                prepareCustomAttributes(definitions, values);
            }

            return {
              instance: assessment,
            };
          });

          this.attr('paging.total', response.total);
          this.attr('relatedAssessments').replace(assessments);

          this.attr('loading', false);
        }, () => {
          this.attr('loading', false);
        });
    },
    checkReuseAbility(evidence) {
      let isFile = evidence.attr('document_type') === 'EVIDENCE';
      let isGdriveIdProvided = !!evidence.attr('gdrive_id');

      let isAble = !isFile || isGdriveIdProvided;

      return isAble;
    },
  },
  init() {
    this.viewModel.loadRelatedAssessments();
  },
  events: {
    '{viewModel.paging} current'() {
      this.viewModel.loadRelatedAssessments();
    },
    '{viewModel.paging} pageSize'() {
      this.viewModel.loadRelatedAssessments();
    },
    '{viewModel.orderBy} changed'() {
      this.viewModel.loadRelatedAssessments();
    },
  },
  helpers: {
    isAllowedToReuse(evidence) {
      evidence = Mustache.resolve(evidence);

      let isAllowed = this.checkReuseAbility(evidence);

      return isAllowed;
    },
    ifAllowedToReuse(evidence, options) {
      evidence = Mustache.resolve(evidence);

      let isAllowed = this.checkReuseAbility(evidence);

      return isAllowed ? options.fn(this) : options.inverse(this);
    },
  },
});
