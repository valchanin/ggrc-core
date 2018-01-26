/*
 * Copyright (C) 2018 Google Inc.
 * Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import {
  uploadFiles,
  findGDriveItemById,
  GDRIVE_PICKER_ERR_CANCEL,
} from '../../plugins/utils/gdrive-picker-utils.js';
import errorTpl from './templates/gdrive_picker_launcher_upload_error.mustache';
import RefreshQueue from '../../models/refresh_queue';

(function (can, $, GGRC, CMS) {
  'use strict';

  GGRC.Components('gDrivePickerLauncher', {
    tag: 'ggrc-gdrive-picker-launcher',
    template: can.view(GGRC.mustache_path + '/gdrive/gdrive_file.mustache'),
    viewModel: {
      define: {
        isInactive: {
          get: function () {
            return this.attr('disabled');
          },
        },
      },
      tooltip: null,
      assessmentTypeObjects: [],
      instance: {},
      link_class: '@',
      click_event: '@',
      itemsUploadedCallback: '@',
      confirmationCallback: '@',
      pickerActive: false,
      disabled: false,
      isUploading: false,
      sanitizeSlug: function (slug) {
        return slug.toLowerCase().replace(/\W+/g, '-');
      },
      removeOldSuffix: function (fileName) {
        let delPos = fileName.lastIndexOf('_ggrc_');
        return delPos > 0 ? fileName.substring(0, delPos) : fileName;
      },
      addFileSuffix: function (fileName) {
        let assesmentSlug =
          this.sanitizeSlug(this.attr('instance').attr('slug'));
        let suffixArr = ['ggrc', assesmentSlug];

        suffixArr = suffixArr.concat(
          this.attr('assessmentTypeObjects').map(function (obj) {
            return this.sanitizeSlug(obj.attr('revision.content.slug'));
          }.bind(this)).attr()
        );

        return fileName.match(/\.(\w+)$/) ?
          // file name with extension
          fileName.replace(/^(.*)\.(\w+)$/, (match, name, fileExt) => {
              return this.removeOldSuffix(name) + '_' + suffixArr.join('_') +
                      '.' + fileExt;
          }) :
          // file name without extension
          this.removeOldSuffix(fileName) + '_' + suffixArr.join('_');
      },
      /**
       * Creates a file edit request
       * @param  {Objects} file       file object
       * @return {Object}             gapi.client.request object
       */
      createEditRequest: function (file) {
        let requestBody = {};

        requestBody.name = file.title;

        // updating filenames on GDrive
        return gapi.client.request({
          path: `/drive/v3/files/${file.id}`,
          method: 'PATCH',
          params: {
            alt: 'json',
          },
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
      },
      /**
       * Creates a file copy request
       * @param  {Object} file        file object
       * @param  {String} newParentId id of the destination folder
       * @return {Object}             gapi.client.request object
       */
      createCopyRequest: function (file, newParentId) {
        let requestBody = {
          parents: [newParentId || 'root'],
        };

        requestBody.name = file.title;

        // updating filenames on GDrive
        return gapi.client.request({
          path: `/drive/v3/files/${file.id}/copy`,
          method: 'POST',
          params: {
            alt: 'json',
          },
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
      },
      /**
       * This function creates a batch request from the
       * array of requests with extra data
       * @param  {Array} requestsBatch Array of objects with gapi.client.request and extra options
       * @param  {Object} originalFileNames Object with original files names. key - fileId, values - original file name
       * @return {Promise} Promise which resolves to array of renamed file objects
       */
      runRenameBatch: function (requestsBatch, originalFileNames) {
        let fileRenameBatch = gapi.client.newBatch();
        let resultFiles = new can.Deferred();

        if ( !requestsBatch.length ) {
          return resultFiles.resolve([]);
        } else {
          requestsBatch.forEach((reqData) => {
            fileRenameBatch.add(reqData.req, reqData.options);
          });
        }

        // Batch promise always resolves ( except when the batch is empty )
        // even when some of requests failed so we manually parsing the
        // response object to find errors
        fileRenameBatch.then((batchRes) => {
          let newFiles = [];
          let errors = [];

          can.each(batchRes.result, function (response, fileId) {
            if ( response.status === 200 ) {
              newFiles.push(response.result);
            } else {
              errors.push({
                fileName: originalFileNames[fileId],
              });
              console.error(
                `File ${originalFileNames[fileId]} failed to be renamed.`,
                response.result.error
              );
            }
          });

          if ( newFiles.length ) {
            // if we have successfully renamed files, showing errors just for
            // the failed ones
            if ( errors.length ) {
              GGRC.Errors.notifier('error', errorTpl, {
                errors: errors,
              });
            }

            resultFiles.resolve(newFiles);
          } else {
            resultFiles.reject(new Error(
                `Failed to attach uploaded files.
                An error occurred while adding suffixes.`));
          }
        });

        return resultFiles;
      },
      /**
       * Copys or renames files adding new suffixes to the file names
       * @param  {Object} [opts={}] Options object.
       * @param  {Array}  files     Array of files models
       * @return {Promise}          Promise which resolves to array of new files
       */
      addFilesSuffixes: function (opts = {}, files) {
        let fileRenameDfd = can.Deferred();
        let requestsBatch = [];
        let originalFileNames = {};
        let newParentId = opts.dest && opts.dest.id;
        let untouchedFiles = [];

        files.forEach((file) => {
          let req;

          // TODO: maybe pick the one format (the one that comes after refresh)?
          let originalFileName = file.title || file.originalFilename;

          let newFileName = this.addFileSuffix(originalFileName);

          let parents = file.parents || [];

          let originalFileExistsInDest = Boolean(
            parents.find((parent) =>
              (parent.id === newParentId) || (!newParentId && parent.isRoot))
          );
          let newFileExistsInDest = originalFileExistsInDest &&
            ( newFileName === originalFileName );

          let sharedFile = file.userPermission.role !== 'owner';

          file.title = newFileName;
          originalFileNames[file.id] = originalFileName;


          // We change the file if it's a new upload (New files are uploaded
          // to the audit folder or GDrive root folder)
          if ( file.newUpload ) {
            req = this.createEditRequest(file, newParentId);

          // ...and copy file if it's a shared one or
          // there's no file with the same name in the folder
          } else if ( sharedFile || !newFileExistsInDest ) {
            req = this.createCopyRequest(file, newParentId);
          // file with the targeted name already exists in the destination directory -
          // just using it ( it can happen when user picks the just attached file again )
          } else {
            untouchedFiles.push(file);
          }

          // updating filenames on GDrive
          if ( req ) {
            requestsBatch.push({
              req,
              options: {
                id: file.id, // settings request id to file id to find the failed file later
              },
            });
          }
        });

        this.runRenameBatch(requestsBatch, originalFileNames)
          .then((files) => {
            files = files.concat(untouchedFiles);

            let refreshDfds = files.map((file)=> findGDriveItemById(file.id));
            can.when(...refreshDfds).then((...files)=> {
              fileRenameDfd.resolve(files);
            }, fileRenameDfd.reject);
          })
          .fail(fileRenameDfd.reject);

        return fileRenameDfd;
      },
      beforeCreateHandler: function (files) {
        let tempFiles = files.map(function (file) {
          return {
            title: this.addFileSuffix(file.title),
            link: file.url,
            created_at: new Date(),
            isDraft: true,
          };
        }.bind(this));
        this.dispatch({
          type: 'onBeforeAttach',
          items: tempFiles,
        });
        return files;
      },
      onKeyup(element, event) {
        const ESCAPE_KEY_CODE = 27;
        const escapeKeyWasPressed = event.keyCode === ESCAPE_KEY_CODE;

        if (escapeKeyWasPressed) {
          const $element = $(element);
          event.stopPropagation();
          // unset focus for attach button
          $element.blur();
        }
      },
      onClickHandler: function (scope, el, event) {
        let eventType = this.attr('click_event');
        let handler = this[eventType] || function () {};
        let confirmation = can.isFunction(this.confirmationCallback) ?
          this.confirmationCallback() :
          null;
        let args = arguments;
        let that = this;

        event.preventDefault();
        can.when(confirmation).then(function () {
          handler.apply(that, args);
        });
      },
      trigger_upload: function (scope, el) {
        // upload files without a parent folder (risk assesment)

        this.attr('isUploading', true);
        uploadFiles({
          parentId: el.data('folder-id'),
          pickFolder: el.data('type') === 'folders',
        }).then((files) => {
          scope.attr('pickerActive', false);
          this.beforeCreateHandler(files);

          this.addFilesSuffixes({}, files)
            .then(this.handle_file_upload.bind(this))
            .then((docs) => {
              // Trigger modal:success event on scope
              can.trigger(this, 'modal:success', {arr: docs});
              el.trigger('modal:success', {arr: docs});
            })
            .fail((error)=>{
              this.dispatch({
                type: 'resetItems',
              });
              if ( error ) {
                GGRC.Errors.notifier('error', error && error.message);
              }
            })
            .always(() => {
              this.attr('isUploading', false);
            });
        }).fail((err)=>{
          if ( err && err.type === GDRIVE_PICKER_ERR_CANCEL ) {
            el.trigger('rejected');
          }
          this.attr('isUploading', false);
        });
      },

      refreshFilesModel: function (files) {
        return new RefreshQueue().enqueue(files).trigger();
      },

      trigger_upload_parent: function (scope, el) {
        // upload files with a parent folder (audits and workflows)
        let that = this;
        let parentFolderDfd;
        let folderId;

        if (that.instance.attr('_transient.folder')) {
          parentFolderDfd = can.when(
            [{instance: this.instance.attr('_transient.folder')}]
          );
        } else {
          folderId = this.instance.attr('folder');

          parentFolderDfd = findGDriveItemById(folderId);
        }
        can.Control.prototype.bindXHRToButton(parentFolderDfd, el);

        parentFolderDfd
          .done(function (parentFolder) {
            that.attr('isUploading', true);
            uploadFiles({
              parentId: parentFolder.id,
            })
              .then(that.beforeCreateHandler.bind(that))
              .then(that.addFilesSuffixes.bind(that, {dest: parentFolder}))
              .then(function (files) {
                that.handle_file_upload(files).then(function (docs) {
                  can.trigger(that, 'modal:success', {arr: docs});
                  el.trigger('modal:success', {arr: docs});
                  that.attr('isUploading', false);
                });
              })
              .fail(function () {
                // This case happens when user have no access to write in audit folder
                let error = _.last(arguments);
                if (error && error.code === 403) {
                  GGRC.Errors.notifier('error', GGRC.Errors.messages[403]);

                  can.trigger(that, 'modal:success');
                  el.trigger('modal:success');
                } else if ( error && error.type !== GDRIVE_PICKER_ERR_CANCEL ) {
                  that.dispatch({
                    type: 'resetItems',
                  });

                  GGRC.Errors.notifier('error', error && error.message);
                }
                that.attr('isUploading', false);
              });
          })
          .fail(function () {
            el.trigger('ajax:flash', {
              warning: 'Can\'t upload: No GDrive folder found',
            });
          });
      },

      handle_file_upload: function (files) {
        let that = this;

        let dfdDocs = files.map(function (file) {
          return new CMS.Models.Document({
            context: that.instance.context || {id: null},
            title: file.title,
            link: file.alternateLink,
          }).save().then(function (doc) {
            let objectDoc;

            objectDoc = new CMS.Models.Relationship({
              context: that.instance.context || {id: null},
              source: that.instance,
              destination: doc,
            }).save();

            return objectDoc;
          });
        });
        // waiting for all docs promises
        return can.when(...dfdDocs).then(function () {
          return can.makeArray(arguments);
        });
      },
    },
    events: {
      '{viewModel} modal:success': function () {
        let instance = this.viewModel.instance;
        let itemsUploadedCallback = this.viewModel.itemsUploadedCallback;

        if (can.isFunction(itemsUploadedCallback)) {
          itemsUploadedCallback();
        } else {
          instance.reify();
          instance.refresh();
        }
      },
      '{viewModel} resetItems': function () {
        let itemsUploadedCallback = this.viewModel.itemsUploadedCallback;

        if (can.isFunction(itemsUploadedCallback)) {
          itemsUploadedCallback();
        }
      },
    },
  });
})(window.can, window.can.$, window.GGRC, window.CMS);
