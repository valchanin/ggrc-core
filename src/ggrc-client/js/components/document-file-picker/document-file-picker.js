/*
  Copyright (C) 2018 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {
  uploadFiles,
} from '../../plugins/utils/gdrive-picker-utils';
import '../spinner/spinner';
import '../object-list-item/editable-document-object-list-item';
import template from './document-file-picker.mustache';

const viewModel = can.Map.extend({
  document: null,
  define: {
    showAttach: {
      get() {
        let title = this.attr('document.title');
        let link = this.attr('document.link');
        return can.isEmptyObject(title) || can.isEmptyObject(link);
      },
    },
  },
  loading: false,
  pickFile() {
    this.attr('loading', true);
    uploadFiles().then((files) => {
      let file = files[0];
      this.document.attr({
        title: file.title,
        link: file.alternateLink,
        created_at: Date.now(),
      });
    }).always(()=> {
      this.attr('loading', false);
    });
  },
  unpickFile() {
    this.document.attr({
      title: null,
      link: null,
    });
  },
});

export default can.Component.extend({
  tag: 'document-file-picker',
  template,
  viewModel,
});
