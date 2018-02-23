/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../controls-toolbar/controls-toolbar';
import '../assessment-local-ca';
import '../assessment-custom-attributes';
import '../assessment-people';
import '../assessment-object-type-dropdown';
import '../attach-button';
import '../info-pane-save-status';
import '../../comment/comment-add-form';
import '../../comment/mapped-comments';
import '../mapped-objects/mapped-controls';
import '../../assessment/map-button-using-assessment-type';
import '../../ca-object/ca-object-modal-content';
import '../../comment/comment-add-form';
import '../../custom-attributes/custom-attributes';
import '../../custom-attributes/custom-attributes-field';
import '../../custom-attributes/custom-attributes-status';
import '../../prev-next-buttons/prev-next-buttons';
import '../../inline/inline-form-control';
import '../../object-change-state/object-change-state';
import '../../related-objects/related-assessments';
import '../../related-objects/related-issues';
import '../../issue-tracker/issue-tracker-switcher';
import '../../object-list-item/editable-document-object-list-item';
import '../../object-state-toolbar/object-state-toolbar';
import '../../loading/loading-status';
import './info-pane-issue-tracker-fields';
import '../../tabs/tab-container';
import './inline-item';
import './create-url';
import './confirm-edit-action';
import '../../multi-select-label/multi-select-label';
import {
  buildParam,
  batchRequests,
} from '../../../plugins/utils/query-api-utils';
import {
  getCustomAttributes,
  CUSTOM_ATTRIBUTE_TYPE,
  convertToFormViewField,
  convertValuesToFormFields,
  applyChangesToCustomAttributeValue,
} from '../../../plugins/utils/ca-utils';
import DeferredTransaction from '../../../plugins/utils/deferred-transaction-utils';
import tracker from '../../../tracker';
import {REFRESH_TAB_CONTENT,
  RELATED_ITEMS_LOADED,
  REFRESH_MAPPING,
} from '../../../events/eventTypes';
import Permission from '../../../permission';
import template from './info-pane.mustache';

(function (can, GGRC, CMS) {
  'use strict';
  const editableStatuses = ['Not Started', 'In Progress', 'Rework Needed'];

  /**
   * Assessment Specific Info Pane View Component
   */
  GGRC.Components('assessmentInfoPane', {
    tag: 'assessment-info-pane',
    template: template,
    viewModel: {
      documentTypes: {
        evidences: 'EVIDENCE',
        urls: 'URL',
        referenceUrls: 'REFERENCE_URL',
      },
      define: {
        verifiers: {
          get: function () {
            let acl = this.attr('instance.access_control_list');
            let verifierRoleId = this.attr('_verifierRoleId');
            let verifiers;

            if (!verifierRoleId) {
              return [];
            }

            verifiers = acl
              .filter((item) => item.ac_role_id == verifierRoleId)
              .map((item) => item.person);

            return verifiers;
          },
        },
        showProcedureSection: {
          get: function () {
            return this.instance.attr('test_plan') ||
              this.instance.attr('issue_tracker.issue_url');
          },
        },
        isSaving: {
          type: 'boolean',
          value: false,
        },
        isLoading: {
          type: 'boolean',
          value: false,
        },
        mappedSnapshots: {
          Value: can.List,
        },
        assessmentTypeNameSingular: {
          get: function () {
            let type = this.attr('instance.assessment_type');
            return CMS.Models[type].title_singular;
          },
        },
        assessmentTypeNamePlural: {
          get: function () {
            let type = this.attr('instance.assessment_type');
            return CMS.Models[type].title_plural;
          },
        },
        assessmentTypeObjects: {
          get: function () {
            let self = this;
            return this.attr('mappedSnapshots')
              .filter(function (item) {
                return item.child_type === self
                  .attr('instance.assessment_type');
              });
          },
        },
        relatedInformation: {
          get: function () {
            let self = this;
            return this.attr('mappedSnapshots')
              .filter(function (item) {
                return item.child_type !== self
                  .attr('instance.assessment_type');
              });
          },
        },
        comments: {
          Value: can.List,
        },
        urls: {
          Value: can.List,
        },
        referenceUrls: {
          Value: can.List,
        },
        evidences: {
          Value: can.List,
        },
        editMode: {
          type: 'boolean',
          get: function () {
            let status = this.attr('instance.status');

            return !this.attr('instance.archived') &&
              editableStatuses.includes(status);
          },
          set: function () {
            this.onStateChange({state: 'In Progress', undo: false});
          },
        },
        isEditDenied: {
          get: function () {
            return !Permission
              .is_allowed_for('update', this.attr('instance')) ||
              this.attr('instance.archived');
          },
        },
        instance: {},
        isInfoPaneSaving: {
          get: function () {
            if (this.attr('isUpdatingRelatedItems')) {
              return false;
            }

            return this.attr('isUpdatingEvidences') ||
              this.attr('isUpdatingUrls') ||
              this.attr('isUpdatingComments') ||
              this.attr('isUpdatingReferenceUrls') ||
              this.attr('isAssessmentSaving');
          },
        },
      },
      modal: {
        open: false,
      },
      _verifierRoleId: undefined,
      isUpdatingRelatedItems: false,
      isAssessmentSaving: false,
      onStateChangeDfd: {},
      formState: {},
      noItemsText: '',
      initialState: 'Not Started',
      assessmentMainRoles: ['Creators', 'Assignees', 'Verifiers'],
      setUrlEditMode: function (value, type) {
        this.attr(type + 'EditMode', value);
      },
      setInProgressState: function () {
        this.onStateChange({state: 'In Progress', undo: false});
      },
      getQuery: function (type, sortObj, additionalFilter) {
        let relevantFilters = [{
          type: this.attr('instance.type'),
          id: this.attr('instance.id'),
          operation: 'relevant',
        }];
        return buildParam(type,
            sortObj || {},
            relevantFilters,
            [],
            additionalFilter || []);
      },
      getCommentQuery: function () {
        return this.getQuery('Comment',
          {sortBy: 'created_at', sortDirection: 'desc'});
      },
      getSnapshotQuery: function () {
        return this.getQuery('Snapshot');
      },
      getDocumentQuery: function (documentType) {
        let query = this.getQuery(
          'Evidence',
          {sortBy: 'created_at', sortDirection: 'desc'},
          this.getDocumentAdditionFilter(documentType));
        return query;
      },
      requestQuery: function (query, type) {
        let dfd = can.Deferred();
        type = type || '';
        this.attr('isUpdating' + can.capitalize(type), true);

        batchRequests(query)
          .done(function (response) {
            let type = Object.keys(response)[0];
            let values = response[type].values;
            dfd.resolve(values);
          })
          .fail(function () {
            dfd.resolve([]);
          })
          .always(function () {
            this.attr('isUpdating' + can.capitalize(type), false);

            tracker.stop(this.attr('instance.type'),
              tracker.USER_JOURNEY_KEYS.NAVIGATION,
              tracker.USER_ACTIONS.OPEN_INFO_PANE);
          }.bind(this));
        return dfd;
      },
      loadSnapshots: function () {
        let query = this.getSnapshotQuery();
        return this.requestQuery(query);
      },
      loadComments: function () {
        let query = this.getCommentQuery();
        return this.requestQuery(query, 'comments');
      },
      loadEvidences: function () {
        let query = this.getDocumentQuery(
          this.attr('documentTypes.evidences'));
        return this.requestQuery(query, 'evidences');
      },
      loadUrls: function () {
        let query = this.getDocumentQuery(
          this.attr('documentTypes.urls'));
        return this.requestQuery(query, 'urls');
      },
      loadReferenceUrls: function () {
        let query = this.getDocumentQuery(
          this.attr('documentTypes.referenceUrls'));
        return this.requestQuery(query, 'referenceUrls');
      },
      updateItems: function () {
        can.makeArray(arguments).forEach(function (type) {
          this.attr(type).replace(this['load' + can.capitalize(type)]());
        }.bind(this));
      },
      afterCreate: function (event, type) {
        let createdItems = event.items;
        let success = event.success;
        let items = this.attr(type);
        let resultList = items
          .map(function (item) {
            createdItems.forEach(function (newItem) {
              if (item._stamp && item._stamp === newItem._stamp) {
                if (!success) {
                  newItem.attr('isNotSaved', true);
                }
                newItem.removeAttr('_stamp');
                newItem.removeAttr('isDraft');
                item = newItem;
              }
            });
            return item;
          })
          .filter(function (item) {
            return !item.attr('isNotSaved');
          });
        this.attr('isUpdating' + can.capitalize(type), false);

        items.replace(resultList);
      },
      addItems: function (event, type) {
        let items = event.items;
        this.attr('isUpdating' + can.capitalize(type), true);
        return this.attr(type).unshift.apply(this.attr(type),
          can.makeArray(items));
      },
      getDocumentAdditionFilter: function (documentType) {
        return documentType ?
          {
            expression: {
              left: 'document_type',
              op: {name: '='},
              right: documentType,
            },
          } :
          [];
      },
      addAction: function (actionType, related) {
        let assessment = this.attr('instance');
        let path = 'actions.' + actionType;

        if (!assessment.attr('actions')) {
          assessment.attr('actions', {});
        }
        if (assessment.attr(path)) {
          assessment.attr(path).push(related);
        } else {
          assessment.attr(path, [related]);
        }
      },
      addRelatedItem: function (event, type) {
        let self = this;
        let related = {
          id: event.item.attr('id'),
          type: event.item.attr('type'),
        };

        this.attr('deferredSave').push(function () {
          self.addAction('add_related', related);
        })
          .done(function () {
            self.afterCreate({
              items: [event.item],
              success: true,
            }, type);
          })
          .fail(function () {
            self.afterCreate({
              items: [event.item],
              success: false,
            }, type);
          })
          .always(function (assessment) {
            assessment.removeAttr('actions');
            // dispatching event on instance to pass to the auto-save-form
            self.attr('instance').dispatch(RELATED_ITEMS_LOADED);
          });
      },
      removeRelatedItem: function (item, type) {
        let self = this;
        let related = {
          id: item.attr('id'),
          type: item.attr('type'),
        };
        let items = self.attr(type);
        let index = items.indexOf(item);
        this.attr('isUpdating' + can.capitalize(type), true);
        items.splice(index, 1);

        this.attr('deferredSave').push(function () {
          self.addAction('remove_related', related);
        })
        .fail(function () {
          GGRC.Errors.notifier('error', 'Unable to remove URL.');
          items.splice(index, 0, item);
        })
        .always(function (assessment) {
          assessment.removeAttr('actions');
          self.attr('isUpdating' + can.capitalize(type), false);
        });
      },
      updateRelatedItems: function () {
        this.attr('isUpdatingRelatedItems', true);

        this.attr('instance').getRelatedObjects()
          .then((data) => {
            this.attr('mappedSnapshots').replace(data.Snapshot);
            this.attr('comments').replace(data.Comment);
            this.attr('evidences').replace(data['Evidence:EVIDENCE']);
            this.attr('urls').replace(data['Evidence:URL']);
            this.attr('referenceUrls').replace(data['Evidence:REFERENCE_URL']);

            this.attr('isUpdatingRelatedItems', false);
            this.attr('instance').dispatch(RELATED_ITEMS_LOADED);

            tracker.stop(this.attr('instance.type'),
              tracker.USER_JOURNEY_KEYS.NAVIGATION,
              tracker.USER_ACTIONS.OPEN_INFO_PANE);
          });
      },
      initializeFormFields: function () {
        let cavs =
          getCustomAttributes(
            this.attr('instance'),
            CUSTOM_ATTRIBUTE_TYPE.LOCAL
          );
        this.attr('formFields',
          convertValuesToFormFields(cavs)
        );
      },
      initGlobalAttributes: function () {
        let cavs =
          getCustomAttributes(
            this.attr('instance'),
            CUSTOM_ATTRIBUTE_TYPE.GLOBAL
          );
        this.attr('globalAttributes',
          cavs.map(function (cav) {
            return convertToFormViewField(cav);
          })
        );
      },
      initializeDeferredSave: function () {
        this.attr('deferredSave', new DeferredTransaction(
          function (resolve, reject) {
            this.attr('instance').save().done(resolve).fail(reject);
          }.bind(this), 1000, true));
      },
      onStateChange: function (event) {
        let isUndo = event.undo;
        let newStatus = event.state;
        let instance = this.attr('instance');
        let previousStatus = instance.attr('previousStatus') || 'In Progress';
        let stopFn = tracker.start(instance.type,
          tracker.USER_JOURNEY_KEYS.NAVIGATION,
          tracker.USER_ACTIONS.ASSESSMENT.CHANGE_STATUS);
        const resetStatusOnConflict = (object, xhr) => {
          if (xhr && xhr.status === 409 && xhr.remoteObject) {
            instance.attr('status', xhr.remoteObject.status);
          }
        };

        this.attr('onStateChangeDfd', can.Deferred());

        if (isUndo) {
          instance.attr('previousStatus', undefined);
        } else {
          instance.attr('previousStatus', instance.attr('status'));
        }
        instance.attr('isPending', true);

        instance.attr('status', isUndo ? previousStatus : newStatus);
        if (instance.attr('status') === 'In Review' && !isUndo) {
          $(document.body).trigger('ajax:flash',
            {hint: 'The assessment is complete. ' +
            'The verifier may revert it if further input is needed.'});
        }

        return instance.save().then(() => {
          this.initializeFormFields();
          this.attr('onStateChangeDfd').resolve();
          stopFn();
        }).always(() => instance.attr('isPending', false))
          .fail(resetStatusOnConflict);
      },
      saveGlobalAttributes: function (event) {
        let globalAttributes = event.globalAttributes;
        let caValues = this.attr('instance.custom_attribute_values');
        applyChangesToCustomAttributeValue(caValues, globalAttributes);

        return this.attr('instance').save();
      },
      showRequiredInfoModal: function (e, field) {
        let scope = field || e.field;
        let errors = scope.attr('errorsMap');
        let errorsList = can.Map.keys(errors)
          .map(function (error) {
            return errors[error] ? error : null;
          })
          .filter(function (errorCode) {
            return !!errorCode;
          });
        let data = {
          options: scope.attr('options'),
          contextScope: scope,
          fields: errorsList,
          value: scope.attr('value'),
          title: scope.attr('title'),
          type: scope.attr('type'),
          saveDfd: e.saveDfd || can.Deferred().resolve(),
        };
        let title = 'Required ' +
          data.fields.map(function (field) {
            return can.capitalize(field);
          }).join(' and ');

        can.batch.start();
        this.attr('modal', {
          content: data,
          modalTitle: title,
          state: {},
        });
        can.batch.stop();
        this.attr('modal.state.open', true);
      },
      setVerifierRoleId: function () {
        let verifierRoleIds = GGRC.access_control_roles
          .filter((item) => item.object_type === 'Assessment' &&
            item.name === 'Verifiers')
          .map((item) => item.id);

        let verifierRoleId = _.head(verifierRoleIds);
        this.attr('_verifierRoleId', verifierRoleId);
      },
    },
    init: function () {
      this.viewModel.initializeFormFields();
      this.viewModel.initGlobalAttributes();
      this.viewModel.updateRelatedItems();
      this.viewModel.initializeDeferredSave();

      this.viewModel.setVerifierRoleId();
    },
    events: {
      [`{viewModel.instance} ${REFRESH_MAPPING.type}`]() {
        this.viewModel.attr('mappedSnapshots')
          .replace(this.viewModel.loadSnapshots());
      },
      '{viewModel.instance} modelBeforeSave': function () {
        this.viewModel.attr('isAssessmentSaving', true);
      },
      '{viewModel.instance} modelAfterSave': function () {
        this.viewModel.attr('isAssessmentSaving', false);
      },
      '{viewModel.instance} assessment_type'() {
        const onSave = () => {
          this.viewModel.instance.dispatch({
            ...REFRESH_TAB_CONTENT,
            tabId: 'tab-related-assessments',
          });
          this.viewModel.instance.unbind('updated', onSave);
        };
        this.viewModel.instance.bind('updated', onSave);
      },
      '{viewModel} instance': function () {
        this.viewModel.initializeFormFields();
        this.viewModel.initGlobalAttributes();
        this.viewModel.updateRelatedItems();
      },
      '{viewModel.instance} resolvePendingBindings': function () {
        this.viewModel.updateItems('referenceUrls');
      },
    },
    helpers: {
      extraClass: function (type) {
        switch (type()) {
          case 'checkbox':
            return 'inline-reverse';
          default:
            return '';
        }
      },
    },
  });
})(window.can, window.GGRC, window.CMS);
