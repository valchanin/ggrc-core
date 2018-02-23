/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../object-list-item/editable-document-object-list-item';
import template from './folder-attachments-list.mustache';

(function (GGRC, can) {
  'use strict';

  let tag = 'folder-attachments-list';

  /**
   * Wrapper Component for rendering and managing of folder and
   * attachments lists
   */
  GGRC.Components('folderAttachmentsList', {
    tag: tag,
    template: template,
    viewModel: {
      define: {
        denyNoFolder: {
          type: 'boolean',
          value: false,
        },
        readonly: {
          type: 'boolean',
          value: false,
        },
        showSpinner: {
          type: 'boolean',
          get: function () {
            return this.attr('isUploading') || this.attr('isUnmapping') ||
              this.attr('isListLoading');
          },
        },
        /**
         * Indicates whether uploading files without parent folder allowed
         * @type {boolean}
         */
        isNoFolderUploadingAllowed: {
          type: 'boolean',
          get: function () {
            return !this.attr('denyNoFolder') && !this.attr('folderError');
          },
        },
      },
      title: null,
      subLabel: '@',
      tooltip: null,
      instance: null,
      currentFolder: null,
      folderError: null,
      isUploading: false,
      isUnmapping: false,
      isListLoading: false,
      useMapper: false,
      itemsUploadedCallback: function () {
        if (this.instance instanceof CMS.Models.Control) {
          this.instance.dispatch('refreshInstance');
        }
      },
    },
    events: {
      init: function () {},
    },
  });
})(window.GGRC, window.can);
