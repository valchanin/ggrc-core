/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (GGRC, can) {
  'use strict';

  var CAUtils = GGRC.Utils.CustomAttributes;
  var CA_DD_REQUIRED_DEPS = CAUtils.CA_DD_REQUIRED_DEPS;

  GGRC.Components('assessmentLocalCa', {
    tag: 'assessment-local-ca',
    viewModel: {
      instance: null,
      formSavedDeferred: can.Deferred().resolve(),
      fields: [],
      isDirty: false,
      saving: false,

      define: {
        hasValidationErrors: {
          type: 'boolean',
          get: function () {
            return this.attr('fields')
              .filter(function (field) {
                var isEmpty = field.attr('validation.mandatory') &&
                  field.attr('validation.empty');
                var isNotValid = !field.attr('validation.valid');
                return isEmpty || isNotValid;
              }).length;
          }
        },
        evidenceAmount: {
          type: 'number',
          set: function (newValue, setValue) {
            setValue(newValue);
            this.validateForm();
          }
        },
        isEvidenceRequired: {
          get: function () {
            var optionsWithEvidence = this.attr('fields')
              .filter(function (item) {
                return item.attr('type') === 'dropdown';
              })
              .filter(function (item) {
                var requiredOption =
                  item.attr('validationConfig')[item.attr('value')];

                return requiredOption === CA_DD_REQUIRED_DEPS.EVIDENCE ||
                   requiredOption ===
                    CA_DD_REQUIRED_DEPS.COMMENT_AND_EVIDENCE;
              }).length;
            return optionsWithEvidence > this.attr('evidenceAmount');
          }
        }
      },
      validateForm: function () {
        var self = this;
        this.attr('fields')
          .each(function (field) {
            self.performValidation(field, field.value, true);
          });
      },
      performValidation: function (field, value, initialCheck) {
        var fieldValid;
        var hasMissingEvidence;
        var hasMissingComment;
        var hasMissingValue;
        var requiresEvidence;
        var requiresComment;
        var valCfg = field.validationConfig;
        var fieldValidationConf = valCfg && valCfg[value];
        var isMandatory = field.validation.mandatory;

        requiresEvidence =
          fieldValidationConf === CA_DD_REQUIRED_DEPS.EVIDENCE ||
          fieldValidationConf === CA_DD_REQUIRED_DEPS.COMMENT_AND_EVIDENCE;

        requiresComment =
          fieldValidationConf === CA_DD_REQUIRED_DEPS.COMMENT ||
          fieldValidationConf === CA_DD_REQUIRED_DEPS.COMMENT_AND_EVIDENCE;

        hasMissingEvidence = requiresEvidence &&
          this.attr('isEvidenceRequired');

        hasMissingComment = initialCheck ?
          requiresComment && field.errorsMap.comment : requiresComment;

        if (field.type === 'checkbox') {
          if (value === '1') {
            value = true;
          } else if (value === '0') {
            value = false;
          }

          field.attr({
            validation: {
              show: isMandatory,
              valid: isMandatory ? !hasMissingValue && !!(value) : true,
              hasMissingInfo: false
            }
          });
        } else if (field.type === 'dropdown') {
          fieldValid = (value) ?
            !(hasMissingEvidence || hasMissingComment || hasMissingValue) :
            !isMandatory && !hasMissingValue;

          field.attr({
            validation: {
              show: isMandatory || !!value,
              valid: fieldValid,
              hasMissingInfo: (hasMissingEvidence || hasMissingComment),
              requiresAttachment: (requiresEvidence || requiresComment)
            },
            errorsMap: {
              evidence: hasMissingEvidence,
              comment: hasMissingComment
            }
          });

          if (!initialCheck && (hasMissingEvidence || hasMissingComment)) {
            this.dispatch({
              type: 'validationChanged',
              field: field
            });
          }
        } else {
          // validation for all other fields
          field.attr({
            validation: {
              show: isMandatory,
              valid: isMandatory ? !hasMissingValue && !!(value) : true,
              hasMissingInfo: false
            }
          });
        }
      },
      updateEvidenceValidation: function () {
        var isEvidenceRequired = this.attr('isEvidenceRequired');
        this.attr('fields')
          .filter(function (item) {
            return item.attr('type') === 'dropdown';
          })
          .each(function (item) {
            var isCommentRequired;
            if ((item.attr('validationConfig')[item.attr('value')] === 2 ||
                item.attr('validationConfig')[item.attr('value')] === 3)) {
              isCommentRequired = item.attr('errorsMap.comment');
              item.attr('errorsMap.evidence', isEvidenceRequired);
              item.attr('validation.valid',
                !isEvidenceRequired && !isCommentRequired);
            }
          });
      },
      save: function (fieldId, fieldValue) {
        var self = this;
        var changes = {};
        changes[fieldId] = fieldValue;

        this.attr('isDirty', true);

        this.attr('deferredSave').push(function () {
          var caValues = self.attr('instance.custom_attribute_values');
          CAUtils.applyChangesToCustomAttributeValue(
            caValues,
            new can.Map(changes));

          self.attr('saving', true);
        })
        .done(function () {
          self.attr('formSavedDeferred').resolve();
        })
        // todo: error handling
        .always(function () {
          self.attr('saving', false);
          self.attr('isDirty', false);
        });
      },
      attributeChanged: function (e) {
        e.field.attr('value', e.value);
        this.performValidation(e.field, e.value);
        this.attr('formSavedDeferred', can.Deferred());
        this.save(e.fieldId, e.value);
      }
    },
    events: {
      '{viewModel.instance} update': function () {
        this.viewModel.validateForm();
      },
      '{viewModel.instance} afterCommentCreated': function () {
        this.viewModel.validateForm();
      }
    }
  });
})(window.GGRC, window.can);
