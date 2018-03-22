/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../object-list-item/editable-document-object-list-item';
import template from './folder-attachments-list.mustache';

/**
 * Wrapper Component for rendering and managing of folder and
 * attachments lists
 */
export default can.Component.extend({
  tag: 'folder-attachments-list',
  template: template,
  viewModel: {
    define: {
      showSpinner: {
        type: 'boolean',
        get: function () {
          return this.attr('isUnmapping') || this.attr('isListLoading');
        },
      },
    },
    readonly: false,
    title: null,
    tooltip: null,
    instance: null,
    folderError: null,
    isUnmapping: false,
    isListLoading: false,
  },
});
