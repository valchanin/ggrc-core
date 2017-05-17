/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (GGRC, can) {
  'use strict';

  var tag = 'assessment-attachments-list';
  var template = can.view(GGRC.mustache_path +
    '/components/assessment/attachments-list.mustache');

  /**
   * Wrapper Component for rendering and managing of attachments lists
   */
  GGRC.Components('assessmentAttachmentsList', {
    tag: tag,
    template: template,
    viewModel: {
      define: {
        noItemsText: {
          type: 'string',
          value: ''
        }
      },
      title: '@',
      tooltip: '@',
      limit: 5,
      instance: null,
      confirmationCallback: function () {
        var confirmation = null;

        if (this.instance instanceof CMS.Models.Assessment &&
            this.instance.status !== 'In Progress') {
          confirmation = $.Deferred();
          GGRC.Controllers.Modals.confirm({
            modal_title: 'Confirm moving Assessment to "In Progress"',
            modal_description: 'You are about to move Assesment from "' +
              this.instance.status +
              '" to "In Progress" - are you sure about that?',
            button_view: GGRC.mustache_path + '/modals/prompt_buttons.mustache'
          }, confirmation.resolve, confirmation.reject);
          return confirmation.promise();
        }

        return confirmation;
      },
      itemsUploadedCallback: function () {
        if (this.instance instanceof CMS.Models.Assessment) {
          this.instance.dispatch('refreshInstance');
        }
      }
    }
  });
})(window.GGRC, window.can);
