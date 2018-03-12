/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import '../../plugins/utils/controllers';
import {warning} from '../../plugins/utils/modals';
import {hasWarningType} from '../../plugins/utils/controllers';
import {importRequest} from './import-export-utils';
import '../show-more/show-more';
import '../import-export/download-template/download-template';
import '../collapsible-panel/collapsible-panel';
import quickTips from './templates/quick-tips.mustache';
import template from './templates/csv-import.mustache';
import {
  backendGdriveClient,
  gapiClient,
} from '../../plugins/ggrc-gapi-client';

export default can.Component.extend({
  tag: 'csv-import',
  template: template,
  requestData: null,
  viewModel: {
    importUrl: '/_service/import_csv',
    quickTips,
    'import': null,
    fileId: '',
    fileName: '',
    isLoading: false,
    state: 'select',
    importStatus: '',
    helpUrl: GGRC.config.external_import_help_url,
    states: function () {
      let state = this.attr('state') || 'select';
      let states = {
        select: {
          'class': 'btn-green',
          text: 'Choose file to import',
        },
        analyzing: {
          'class': 'btn-white',
          showSpinner: true,
          isDisabled: true,
          text: 'Analyzing',
        },
        'import': {
          'class': 'btn-green',
          text: 'Import',
          isDisabled: function () {
            // info on blocks to import
            let toImport = this.import;
            let nonEmptyBlockExists;
            let hasErrors;

            if (!toImport || toImport.length < 1) {
              return true;
            }

            // A non-empty block is a block containing at least one
            // line that is not ignored (due to errors, etc.).
            nonEmptyBlockExists = _.any(toImport, function (block) {
              return block.rows > block.ignored;
            });

            hasErrors = _.any(toImport, function (block) {
              return block.block_errors.length;
            });

            return hasErrors || !nonEmptyBlockExists;
          }.bind(this),
        },
        importing: {
          'class': 'btn-white',
          showSpinner: true,
          isDisabled: true,
          text: 'Importing',
        },
        success: {
          'class': 'btn-green',
          isDisabled: true,
          text: '<i class="fa fa-check-square-o white">'+
            '</i> Import successful',
        },
      };

      return _.extend(states[state], {state: state});
    },
    prepareDataForCheck: function (requestData) {
      let checkResult = {
        hasDeprecations: false,
        hasDeletions: false,
      };

      // check if imported data has deprecated or deleted objects
      _.each(requestData, function (element) {
        if (
          checkResult.hasDeprecations &&
          checkResult.hasDeletions
        ) {
          return false;
        }

        if (!checkResult.hasDeletions) {
          checkResult.hasDeletions = (element.deleted > 0);
        }

        if (!checkResult.hasDeprecations) {
          checkResult.hasDeprecations = (element.deprecated > 0);
        }
      });

      return {
        data: requestData,
        check: checkResult,
      };
    },
    processLoadedInfo: function (data) {
      this.attr('import', _.map(data, (element) => {
        element.data = [];
        if (element.block_warnings.length + element.row_warnings.length) {
          let messages = [...element.block_warnings, ...element.row_warnings];

          this.attr('importStatus', 'warning');

          element.data.push({
            title: `WARNINGS (${messages.length})`,
            messages,
          });
        }
        if (element.block_errors.length + element.row_errors.length) {
          let messages = [...element.block_errors, ...element.row_errors];

          this.attr('importStatus', 'error');

          element.data.push({
            title: `ERRORS (${messages.length})`,
            messages,
          });
        }
        return element;
      }));
      this.attr('state', 'import');
    },
    needWarning: function (checkObj, data) {
      let hasWarningTypes = _.every(data, function (item) {
        return hasWarningType({type: item.name});
      });
      return hasWarningTypes &&
        (
          checkObj.hasDeletions ||
          checkObj.hasDeprecations
        );
    },
    beforeProcess: function (check, data, element) {
      let operation;
      let needWarning = this.needWarning(check, data);

      if (needWarning) {
        operation = this.getOperationNameFromCheckObj(check);

        warning(
          {
            objectShortInfo: 'imported object(s)',
            modal_description:
              'In the result of import some Products, Systems or ' +
              'Processes will be ' + operation.past + '.',
            operation: operation.action,
          },
          function () {
            this.processLoadedInfo(data);
          }.bind(this),
          function () {
            this.attr('state', 'import');
            this.resetFile(element);
          }.bind(this)
        );
        return;
      }

      this.processLoadedInfo(data);
    },
    getOperationNameFromCheckObj: function (checkObj) {
      let action = _.compact([
        checkObj.hasDeletions ? 'deletion' : '',
        checkObj.hasDeprecations ? 'deprecation' : '',
      ]).join(' and ');
      let pastForm = _.compact([
        checkObj.hasDeletions ? 'deleted' : '',
        checkObj.hasDeprecations ? 'deprecated' : '',
      ]).join(' and ');

      return {
        action: action,
        past: pastForm,
      };
    },
    resetFile: function (element) {
      this.attr({
        state: 'select',
        fileId: '',
        fileName: '',
        importStatus: '',
        'import': null,
      });
      element.find('.csv-upload').val('');
    },
    requestImport: function (file) {
      this.attr('state', 'analyzing');
      this.attr('isLoading', true);
      this.attr('fileId', file.id);
      this.attr('fileName', file.name);

      backendGdriveClient.withAuth(()=> {
        return importRequest({data: {id: file.id}}, true);
      }, {responseJSON: {message: 'Unable to Authorize'}})
        .then(this.prepareDataForCheck.bind(this))
        .then(function (checkObject) {
          this.beforeProcess(
            checkObject.check,
            checkObject.data,
            this.element
          );
        }.bind(this))
        .fail(function (data) {
          this.attr('state', 'select');
          GGRC.Errors.notifier('error', data.responseJSON.message);
        }.bind(this))
        .always(function () {
          this.attr('isLoading', false);
        }.bind(this));
    },
    selectFile() {
      let that = this;
      let allowedTypes = ['text/csv', 'application/vnd.google-apps.document',
        'application/vnd.google-apps.spreadsheet'];

      return gapiClient.authorizeGapi(['https://www.googleapis.com/auth/drive'])
        .then(()=> {
          gapi.load('picker', {callback: createPicker});
        });

      function createPicker() {
        let dialog;
        let docsUploadView;
        let docsView;
        let picker = new google.picker.PickerBuilder()
          .setOAuthToken(gapi.auth.getToken().access_token)
          .setDeveloperKey(GGRC.config.GAPI_KEY)
          .setCallback(pickerCallback);

        docsUploadView = new google.picker.DocsUploadView();
        docsView = new google.picker.DocsView()
          .setMimeTypes(allowedTypes);

        picker.addView(docsUploadView)
          .addView(docsView);

        picker = picker.build();
        picker.setVisible(true);

        $('div.picker-dialog-bg').css('zIndex', 4000);

        dialog = GGRC.Utils.getPickerElement(picker);
        if (dialog) {
          dialog.style.zIndex = 4001;
        }
      }

      function pickerCallback(data) {
        let file;
        let PICKED = google.picker.Action.PICKED;
        let ACTION = google.picker.Response.ACTION;
        let DOCUMENTS = google.picker.Response.DOCUMENTS;

        if (data[ACTION] === PICKED) {
          file = data[DOCUMENTS][0];

          if (file && _.any(allowedTypes, function (type) {
            return type === file.mimeType;
          })) {
            that.requestImport(file);
          } else {
            GGRC.Errors.notifier('error',
              'Something other than a csv-file was chosen. ' +
              'Please choose a csv-file.');
          }
        }
      }
    },
  },
  events: {
    '.state-reset click': function (el, ev) {
      ev.preventDefault();
      this.viewModel.selectFile();
      this.viewModel.resetFile(this.element);
    },
    '.state-import click': function (el, ev) {
      ev.preventDefault();
      this.viewModel.attr('state', 'importing');

      importRequest({
        data: {id: this.viewModel.attr('fileId')},
      }, false)
        .done(function (data) {
          let result_count = data.reduce(function (prev, curr) {
            _.each(Object.keys(prev), function (key) {
              prev[key] += curr[key] || 0;
            });
            return prev;
          }, {created: 0, updated: 0, deleted: 0, ignored: 0});

          this.viewModel.attr('state', 'success');
          this.viewModel.attr('data', [result_count]);
        }.bind(this))
        .fail(function (data) {
          this.viewModel.attr('state', 'select');
          GGRC.Errors.notifier('error', data.responseJSON.message);
        }.bind(this))
        .always(function () {
          this.viewModel.attr('isLoading', false);
        }.bind(this));
    },
    '#import_btn.state-select click': function (el, ev) {
      ev.preventDefault();
      this.viewModel.selectFile();
    },
  },
});
