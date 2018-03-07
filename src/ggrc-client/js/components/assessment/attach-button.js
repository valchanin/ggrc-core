/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import Permission from '../../permission';
import template from './attach-button.mustache';
import {findGDriveItemById} from '../../plugins/utils/gdrive-picker-utils';

(function (GGRC, can) {
  'use strict';

  let tag = 'attach-button';

  GGRC.Components('attachButton', {
    tag: tag,
    template: template,
    confirmationCallback: '@',
    viewModel: {
      define: {
        hasPermissions: {
          get: function (prevValue, setValue) {
            let instance = this.attr('instance');
            if (Permission.is_allowed_for('update', instance) &&
              !instance.attr('archived')) {
              this.checkFolder().always(function () {
                setValue(true);
              });
            } else {
              setValue(false);
            }
          },
        },
      },
      canAttach: false,
      isFolderAttached: false,
      error: {},
      instance: null,
      isAttachActionDisabled: false,
      onBeforeCreate: function (event) {
        let items = event.items;
        this.dispatch({type: 'beforeCreate', items: items});
      },
      refresh: function () {
        this.dispatch('refreshEvidences');

        if (this.attr('instance')) {
          this.attr('instance').dispatch('refreshInstance');
        }
      },
      checkFolder: function () {
        let self = this;

        return this.findFolder().then(function (folder) {
          /*
            during processing of the request to GDrive instance can be updated
            and folder can become null. In this case isFolderAttached value
            should not be updated after request finishing.
          */
          if (folder && self.attr('instance.folder')) {
            self.attr('isFolderAttached', true);
          } else {
            self.attr('isFolderAttached', false);
          }
          self.attr('canAttach', true);
        }, function (err) {
          self.attr('error', err);
          self.attr('canAttach', false);
        });
      },
      findFolder: function () {
        let folderId = this.attr('instance.folder');

        if (!folderId) {
          return can.Deferred().resolve();
        }

        return findGDriveItemById(folderId);
      },
    },
  });
})(window.GGRC, window.can);
