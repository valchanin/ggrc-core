/*!
 Copyright (C) 2017 Google Inc., authors, and contributors
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, GGRC) {
  'use strict';
  var tpl = can.view(GGRC.mustache_path +
    '/components/assessment/info-pane/info-pane.mustache');

  /**
   * Assessment Specific Info Pane View Component
   */
  GGRC.Components('assessmentInfoPane', {
    tag: 'assessment-info-pane',
    template: tpl,
    viewModel: {
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
        controls: {
          get: function () {
            return this.attr('mappedSnapshots')
              .filter(function (item) {
                return item.child_type === 'Control';
              });
          }
        },
        relatedInformation: {
          get: function () {
            return this.attr('mappedSnapshots')
              .filter(function (item) {
                return item.child_type !== 'Control';
              });
          }
        },
        comments: {
          Value: can.List
        },
        documents: {
          Value: can.List
        },
        editMode: {
          type: 'boolean',
          get: function () {
            return this.attr('instance.status') !== 'Completed' &&
              this.attr('instance.status') !== 'Ready for Review';
          },
          set: function () {
            this.attr('instance.status', 'In Progress');
            this.attr('instance').save();
          }
        },
        instance: {}
      },
      modal: {
        open: false
      },
      formState: {},
      triggerFormSaveCbs: $.Callbacks(),
      getQuery: function (type, sortObj) {
        var relevantFilters = [{
          type: this.attr('instance.type'),
          id: this.attr('instance.id'),
          operation: 'relevant'
        }];
        return GGRC.Utils.QueryAPI
          .buildParam(type, sortObj || {}, relevantFilters, [], []);
      },
      getCommentQuery: function () {
        return this.getQuery('Comment',
          {sortBy: 'created_at', sortDirection: 'desc'});
      },
      getSnapshotQuery: function () {
        return this.getQuery('Snapshot');
      },
      getDocumentQuery: function () {
        return this.getQuery('Document');
      },
      requestQuery: function (query) {
        var dfd = can.Deferred();
        this.attr('isLoading', true);
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
            this.attr('isLoading', false);
          }.bind(this));
        return dfd;
      },
      loadSnapshots: function () {
        var query = this.getSnapshotQuery();
        return this.requestQuery(query);
      },
      loadComments: function () {
        var query = this.getCommentQuery();
        return this.requestQuery(query);
      },
      loadDocuments: function () {
        var query = this.getDocumentQuery();
        return this.requestQuery(query);
      },
      updateRelatedItems: function () {
        this.attr('mappedSnapshots')
          .replace(this.loadSnapshots());
        this.attr('comments')
          .replace(this.loadComments());
        this.attr('documents')
          .replace(this.loadDocuments());
      },
      initializeFormFields: function () {
        this.attr('formFields',
          GGRC.Utils.CustomAttributes.convertValuesToFormFields(
            this.attr('instance.custom_attribute_values')
          )
        );
      },
      onFormSave: function () {
        this.attr('triggerFormSaveCbs').fire();
      },
      saveFormFields: function (formFields) {
        var caValues = can.makeArray(
          this.attr('instance.custom_attribute_values')
        );
        Object.keys(formFields).forEach(function (fieldId) {
          var caValue =
            caValues
              .find(function (item) {
                return item.def.id === Number(fieldId);
              });
          if (!caValue) {
            console.error('Corrupted Date: ', caValues);
            return;
          }
          caValue.attr('attribute_value',
            GGRC.Utils.CustomAttributes.convertToCaValue(
              caValue.attr('attributeType'),
              formFields[fieldId]
            )
          );
        });

        return this.attr('instance').save();
      },
      showRequiredInfoModal: function (scope) {
        var errors = scope.attr('errorsMap');
        var errorsList = can.Map.keys(errors)
          .map(function (error) {
            return errors[error] ? error : null;
          })
          .filter(function (errorCode) {
            return !!errorCode;
          });
        var data = {
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
          caIds: {
            defId: scope.attr('id'),
            valueId: scope.attr('valueId')()
          },
          modalTitle: title,
          state: {}
        });
        can.batch.stop();
        this.attr('modal.state.open', true);
      }
    },
    init: function () {
      this.viewModel.initializeFormFields();
      this.viewModel.updateRelatedItems();
    },
    events: {
      '{viewModel.instance} refreshInstance': function () {
        this.viewModel.updateRelatedItems();
      }
    }
  });
})(window.can, window.GGRC);
