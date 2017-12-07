/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../comment/comment-input';
import '../comment/comment-add-button';
import '../object-list-item/editable-document-object-list-item';
import '../assessment/attach-button';
import template from './ca-object-modal-content.mustache';

(function (can, GGRC) {
  'use strict';

  can.Component.extend({
    tag: 'ca-object-modal-content',
    template: template,
    viewModel: {
      define: {
        comment: {
          get: function () {
            return this.attr('content.fields').indexOf('comment') > -1 &&
              this.attr('state.open');
          }
        },
        evidence: {
          get: function () {
            return this.attr('content.fields').indexOf('evidence') > -1 &&
              this.attr('state.open');
          }
        },
        state: {
          value: {
            open: false,
            save: false,
            controls: false
          }
        }
      },
      formSavedDeferred: can.Deferred(),
      isUpdatingEvidences: false,
      content: {
        contextScope: {},
        fields: [],
        title: '',
        type: 'dropdown',
        value: null,
        options: []
      },
      afterCreation: function (comment, success) {
        this.dispatch({
          type: 'afterCommentCreated',
          item: comment,
          success: success
        });
      },
      onCommentCreated: function (e) {
        var comment = e.comment;
        var instance = this.attr('instance');
        var context = instance.attr('context');
        var self = this;
        var addComment = function (data) {
          return comment.attr(data)
            .save()
            .done(function (comment) {
              self.afterCreation(comment, true);
            })
            .fail(function (comment) {
              self.afterCreation(comment, false);
            });
        };

        this.dispatch({
          type: 'beforeCommentCreated',
          items: [can.extend(comment.attr(), {
            assignee_type: GGRC.Utils.getAssigneeType(instance),
            custom_attribute_revision: {
              custom_attribute: {
                title: this.attr('content.title')
              },
              custom_attribute_stored_value: this.attr('content.value')
            }
          })]
        });
        this.attr('content.contextScope.errorsMap.comment', false);
        this.attr('content.contextScope.validation.valid',
          !this.attr('content.contextScope.errorsMap.evidence'));
        this.attr('state.open', false);
        this.attr('state.save', false);

        this.attr('formSavedDeferred')
          .then(function () {
            addComment({
              context: context,
              assignee_type: GGRC.Utils.getAssigneeType(instance),
              custom_attribute_revision_upd: {
                custom_attribute_value: {
                  id: self.attr('content.contextScope.valueId')()
                },
                custom_attribute_definition: {
                  id: self.attr('content.contextScope.id')
                }
              }
            });
          });
      }
    }
  });
})(window.can, window.GGRC);
