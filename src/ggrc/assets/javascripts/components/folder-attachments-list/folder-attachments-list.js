/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../object-list-item/editable-document-object-list-item';
import template from './folder-attachments-list.mustache';

(function (GGRC, can) {
  'use strict';

  var tag = 'folder-attachments-list';

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
          value: false
        },
        readonly: {
          type: 'boolean',
          value: false
        },
        /**
         * Indicates whether uploading files without parent folder allowed
         * @type {boolean}
         */
        isNoFolderUploadingAllowed: {
          type: 'boolean',
          get: function () {
            return !this.attr('denyNoFolder') && !this.attr('folderError');
          }
        }
      },
      title: '@',
      tooltip: '@',
      subLabel: '@',
      instance: null,
      currentFolder: null,
      folderError: null,
      isFilesLoaded: false,
      itemsUploadedCallback: function () {
        if (this.instance instanceof CMS.Models.Control) {
          this.instance.dispatch('refreshInstance');
        }
      }
    },
    events: {
      init: function () {}
    }
  });
})(window.GGRC, window.can);
