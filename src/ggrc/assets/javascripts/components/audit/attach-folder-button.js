/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './attach-folder-button.mustache';

GGRC.Components('attachFolderButton', {
 tag: 'attach-folder-button',
 template: template,
 viewModel: {
   define: {
     isEditDenied: {
       type: 'boolean',
       get: function () {
         return !Permission
           .is_allowed_for('update', this.attr('instance')) ||
           this.attr('instance.archived');
       }
     }
   },
   instance: null
 }
});
