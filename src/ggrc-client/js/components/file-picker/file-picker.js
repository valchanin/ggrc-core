/*
  Copyright (C) 2018 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {
  uploadFiles,
} from '../../plugins/utils/gdrive-picker-utils';
import '../spinner/spinner';
import '../object-list-item/editable-document-object-list-item';
import template from './file-picker.mustache';

const viewModel = can.Map.extend({
  instance: null,
  loading: false,
  define: {
    showAttach: {
      get() {
        let title = this.attr('instance.title');
        return can.isEmptyObject(title);
      },
    },
  },
  pickFile() {
    let instance = this.attr('instance');
    this.attr('loading', true);
    uploadFiles().then((files) => {
      let file = files[0];
      instance.attr({
        title: file.title,
        source_gdrive_id: file.id,
        created_at: Date.now(),
      });
    }).always(()=> {
      this.attr('loading', false);
    });
  },
  unpickFile() {
    let instance = this.attr('instance');

    instance.removeAttr('title');
    instance.removeAttr('source_gdrive_id');
    instance.removeAttr('created_at');
  },
});

export default can.Component.extend({
  tag: 'file-picker',
  template,
  viewModel,
});
