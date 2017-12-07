/*
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../related-objects/related-comments';
import '../custom-attributes/custom-attributes-field-view';
import '../mapped-objects/mapped-objects';
import '../object-list-item/comment-list-item';
import '../form/form-validation-icon';
import '../tabs/tab-container';
import '../show-more/show-more';
import '../related-objects/related-comments';
import './object-popover';
import {convertValuesToFormFields} from '../../plugins/utils/ca-utils';
import template from './related-assessment-popover.mustache';

(function (can) {
  'use strict';

  /**
   * Simple wrapper component to load Related to Parent Object Snapshots of Controls and Objectives
   */
  can.Component.extend({
    tag: 'related-assessment-popover',
    template: template,
    viewModel: {
      selectedAssessment: {},
      popoverTitleInfo: 'Assessment Title: ',
      define: {
        hideTitle: {
          type: Boolean,
          value: false,
        },
        popoverDirection: {
          type: String,
          value: 'right',
        },
        selectedAssessmentTitle: {
          get: function () {
            return this.attr('selectedAssessment.data.title');
          },
        },
        selectedAssessmentLink: {
          get: function () {
            return this.attr('selectedAssessment.data.viewLink');
          },
        },
        selectedAssessmentFields: {
          get: function () {
            var caValues =
              this.attr('selectedAssessment.data.custom_attribute_values');
            return caValues ? convertValuesToFormFields(caValues) : [];
          },
        },
      },
    },
  });
})(window.can);
