/*!
 Copyright (C) 2017 Google Inc., authors, and contributors
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, GGRC, CMS) {
  'use strict';
  var tpl = can.view(GGRC.mustache_path +
    '/components/assessment/info-pane/info-pane.mustache');
  var CAUtils = GGRC.Utils.CustomAttributes;

  /**
   * Assessment Specific Info Pane View Component
   */
  GGRC.Components('assessmentInfoPane', {
    tag: 'assessment-info-pane',
    template: tpl,
    viewModel: {
      documentTypes: {
        evidences: CMS.Models.Document.EVIDENCE,
        urls: CMS.Models.Document.URL,
        referenceUrls: CMS.Models.Document.REFERENCE_URL
      },
      define: {
        isSaving: {
          type: 'boolean',
          value: false
        },
        isLoading: {
          type: 'boolean',
          value: false
        },
        mappedSnapshots: {
          Value: can.List
        },
        assessmentTypeNameSingular: {
          get: function () {
            var type = this.attr('instance.assessment_type');
            return CMS.Models[type].title_singular;
          }
        },
        assessmentTypeNamePlural: {
          get: function () {
            var type = this.attr('instance.assessment_type');
            return CMS.Models[type].title_plural;
          }
        },
        assessmentTypeObjects: {
          get: function () {
            var self = this;
            return this.attr('mappedSnapshots')
              .filter(function (item) {
                return item.child_type === self
                  .attr('instance.assessment_type');
              });
          }
        },
        relatedInformation: {
          get: function () {
            var self = this;
            return this.attr('mappedSnapshots')
              .filter(function (item) {
                return item.child_type !== self
                  .attr('instance.assessment_type');
              });
          }
        },
        comments: {
          Value: can.List
        },
        documents: {
          Value: can.List
        },
        urls: {
          get: function () {
            var type = this.attr('documentTypes.urls');
            return this.attr('documents')
              .filter(function (document) {
                return document.attr('document_type') === type;
              });
          }
        },
        referenceUrls: {
          get: function () {
            var type = this.attr('documentTypes.referenceUrls');
            return this.attr('documents')
              .filter(function (document) {
                return document.attr('document_type') === type;
              });
          }
        },
        evidences: {
          get: function () {
            var type = this.attr('documentTypes.evidences');
            return this.attr('documents')
              .filter(function (document) {
                return document.attr('document_type') === type;
              });
          }
        },
        editMode: {
          type: 'boolean',
          get: function () {
            return this.attr('instance.status') !== 'Completed' &&
              this.attr('instance.status') !== 'In Review' &&
              !this.attr('instance.archived');
          },
          set: function () {
            this.onStateChange({state: 'In Progress', undo: false});
          }
        },
        isEditDenied: {
          get: function () {
            return !Permission
              .is_allowed_for('update', this.attr('instance')) ||
              this.attr('instance.archived');
          }
        },
        instance: {}
      },
      modal: {
        open: false
      },
      isAssessmentSaving: false,
      onStateChangeDfd: {},
      formState: {},
      noItemsText: '',
      triggerFormSaveCbs: can.$.Callbacks(),
      setInProgressState: function () {
        this.onStateChange({state: 'In Progress', undo: false});
      },
      getQuery: function (type, sortObj, additionalFilter) {
        var relevantFilters = [{
          type: this.attr('instance.type'),
          id: this.attr('instance.id'),
          operation: 'relevant'
        }];
        return GGRC.Utils.QueryAPI
          .buildParam(type,
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
      getDocumentQuery: function () {
        var query = this.getQuery(
          'Document',
          {sortBy: 'created_at', sortDirection: 'desc'},
          null);
        return query;
      },
      requestQuery: function (query, types) {
        var dfd = can.Deferred();
        types = types || [];
        _.each(types, function (type) {
          this.attr('isUpdating' + can.capitalize(type), true);
        }, this);
        GGRC.Utils.QueryAPI
          .batchRequests(query)
          .done(function (response) {
            var type = Object.keys(response)[0];
            var values = response[type].values;
            dfd.resolve(values);
          })
          .fail(function () {
            dfd.resolve([]);
          })
          .always(function () {
            _.each(types, function (type) {
              this.attr('isUpdating' + can.capitalize(type), false);
            }, this);
          }.bind(this));
        return dfd;
      },
      loadSnapshots: function () {
        var query = this.getSnapshotQuery();
        return this.requestQuery(query);
      },
      loadComments: function () {
        var query = this.getCommentQuery();
        return this.requestQuery(query, ['comments']);
      },
      loadDocuments: function (types) {
        var query = this.getDocumentQuery();
        return this.requestQuery(query, types);
      },
      updateItems: function () {
        this.attr('documents')
          .replace(this.loadDocuments(_.toArray(arguments)));
      },
      afterCreate: function (event, type) {
        var createdItems = event.items;
        var success = event.success;
        var items = this.attr(type);
        var resultList = items
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
      removeItem: function (event, type) {
        var item = event.item;
        var index = this.attr(type).indexOf(item);
        this.attr('isUpdating' + can.capitalize(type), true);
        return this.attr(type).splice(index, 1);
      },
      addItems: function (event, type) {
        var items = event.items;
        this.attr('isUpdating' + can.capitalize(type), true);
        return this.attr(type).unshift.apply(this.attr(type),
          can.makeArray(items));
      },
      updateRelatedItems: function () {
        this.attr('mappedSnapshots')
          .replace(this.loadSnapshots());
        this.attr('comments')
          .replace(this.loadComments());
        this.attr('documents')
          .replace(this.loadDocuments(['evidences', 'urls', 'referenceUrls']));
      },
      initializeFormFields: function () {
        var cavs =
          CAUtils.getAttributes(
            this.attr('instance.custom_attribute_values'), true);
        this.attr('formFields',
          CAUtils.convertValuesToFormFields(cavs)
        );
      },
      initGlobalAttributes: function () {
        var cavs =
          CAUtils.getAttributes(
              this.attr('instance.custom_attribute_values'), false);
        this.attr('globalAttributes',
          cavs.map(function (cav) {
            return CAUtils.convertToFormViewField(cav);
          })
        );
      },
      onFormSave: function () {
        this.attr('triggerFormSaveCbs').fire();
      },
      onStateChange: function (event) {
        var isUndo = event.undo;
        var newStatus = event.state;
        var instance = this.attr('instance');
        var self = this;
        var previousStatus = instance.attr('previousStatus') || 'In Progress';
        this.attr('onStateChangeDfd', can.Deferred());

        if (isUndo) {
          instance.attr('previousStatus', undefined);
        } else {
          instance.attr('previousStatus', instance.attr('status'));
        }
        instance.attr('isPending', true);

        this.attr('formState.formSavedDeferred')
          .then(function () {
            instance.refresh().then(function () {
              instance.attr('status', isUndo ? previousStatus : newStatus);

              if (instance.attr('status') === 'In Review' && !isUndo) {
                $(document.body).trigger('ajax:flash',
                  {hint: 'The assessment is complete. ' +
                  'The verifier may revert it if further input is needed.'});
              }

              return instance.save()
              .then(function () {
                instance.attr('isPending', false);
                self.initializeFormFields();
                self.attr('onStateChangeDfd').resolve();
              });
            });
          });
      },
      saveGlobalAttributes: function (event) {
        var globalAttributes = event.globalAttributes;
        var caValues = this.attr('instance.custom_attribute_values');
        CAUtils.applyChangesToCustomAttributeValue(caValues, globalAttributes);

        return this.attr('instance').save();
      },
      saveFormFields: function (modifiedFields) {
        var caValues = this.attr('instance.custom_attribute_values');
        CAUtils.applyChangesToCustomAttributeValue(caValues, modifiedFields);

        return this.attr('instance').save();
      },
      showRequiredInfoModal: function (e, field) {
        var scope = field || e.field;
        var errors = scope.attr('errorsMap');
        var errorsList = can.Map.keys(errors)
          .map(function (error) {
            return errors[error] ? error : null;
          })
          .filter(function (errorCode) {
            return !!errorCode;
          });
        var data = {
          options: scope.attr('options'),
          contextScope: scope,
          fields: errorsList,
          value: scope.attr('value'),
          title: scope.attr('title'),
          type: scope.attr('type')
        };
        var title = 'Required ' +
          data.fields.map(function (field) {
            return can.capitalize(field);
          }).join(' and ');

        can.batch.start();
        this.attr('modal', {
          content: data,
          modalTitle: title,
          state: {}
        });
        can.batch.stop();
        this.attr('modal.state.open', true);
      }
    },
    init: function () {
      this.viewModel.initializeFormFields();
      this.viewModel.initGlobalAttributes();
      this.viewModel.updateRelatedItems();
    },
    events: {
      '{viewModel.instance} refreshMapping': function () {
        this.viewModel.attr('mappedSnapshots')
          .replace(this.viewModel.loadSnapshots());
      },
      '{viewModel.instance} modelBeforeSave': function () {
        this.viewModel.attr('isAssessmentSaving', true);
      },
      '{viewModel.instance} modelAfterSave': function () {
        this.viewModel.attr('isAssessmentSaving', false);
      },
      '{viewModel} instance': function () {
        this.viewModel.initializeFormFields();
        this.viewModel.initGlobalAttributes();
        this.viewModel.updateRelatedItems();
      },
      '{viewModel.instance} resolvePendingBindings': function () {
        this.viewModel.updateItems('referenceUrls');
      }
    },
    helpers: {
      extraClass: function (type) {
        switch (type()) {
          case 'checkbox':
            return 'inline-reverse';
          default:
            return '';
        }
      }
    }
  });
})(window.can, window.GGRC, window.CMS);
