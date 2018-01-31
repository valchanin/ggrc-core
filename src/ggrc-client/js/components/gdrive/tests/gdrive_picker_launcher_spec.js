/*
  Copyright (C) 2018 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import * as pickerUtils from '../../../plugins/utils/gdrive-picker-utils';

describe('GGRC.Components.gDrivePickerLauncher', function () {
  'use strict';

  let Component;
  let events;
  let viewModel;
  let eventStub = {
    preventDefault: function () {},
  };

  beforeAll(function () {
    Component = GGRC.Components.get('gDrivePickerLauncher');
    events = Component.prototype.events;
  });

  beforeEach(function () {
    viewModel = GGRC.Components.getViewModel('gDrivePickerLauncher');
  });

  describe('onClickHandler() method', function () {
    it('call confirmationCallback() if it is provided', function () {
      spyOn(viewModel, 'confirmationCallback');

      viewModel.onClickHandler(null, null, eventStub);

      expect(viewModel.confirmationCallback).toHaveBeenCalled();
    });

    it('pass callbackResult to can.when()', function () {
      let dfd = can.Deferred();
      let thenSpy = jasmine.createSpy('then');
      spyOn(viewModel, 'confirmationCallback').and.returnValue(dfd);
      spyOn(can, 'when').and.returnValue({
        then: thenSpy,
      });

      viewModel.onClickHandler(null, null, eventStub);

      expect(can.when).toHaveBeenCalledWith(dfd);
      expect(thenSpy).toHaveBeenCalled();
    });

    it('pass null to can.when() when callback is not provided', function () {
      let thenSpy = jasmine.createSpy('then');
      spyOn(can, 'when').and.returnValue({
        then: thenSpy,
      });

      viewModel.onClickHandler(null, null, eventStub);

      expect(can.when).toHaveBeenCalledWith(null);
      expect(thenSpy).toHaveBeenCalled();
    });
  });

  describe('onKeyup() method', function () {
    describe('if escape key was clicked', function () {
      let event;
      let element;

      beforeEach(function () {
        const ESCAPE_KEY_CODE = 27;
        event = {
          keyCode: ESCAPE_KEY_CODE,
          stopPropagation: jasmine.createSpy('stopPropagation'),
        };
        element = $('<div></div>');
      });

      it('calls stopPropagation for passed event', function () {
        viewModel.onKeyup(element, event);
        expect(event.stopPropagation).toHaveBeenCalled();
      });

      it('unsets focus for element', function (done) {
        const blur = function () {
          done();
          element.off('blur', blur);
        };
        element.on('blur', blur);
        viewModel.onKeyup(element, event);
      });
    });
  });

  describe('events', function () {
    describe('"{viewModel} modal:success" handler', function () {
      let method;
      let that;

      beforeEach(function () {
        that = {
          viewModel: viewModel,
        };
        method = events['{viewModel} modal:success'].bind(that);
      });

      it('calls callback if callback is provided', function () {
        viewModel.attr('itemsUploadedCallback', jasmine.createSpy('callback'));
        method();
        expect(viewModel.itemsUploadedCallback).toHaveBeenCalled();
      });

      it('refreshes instance if callback is not provided', function () {
        viewModel.instance = jasmine.createSpyObj('instance',
          ['reify', 'refresh']);
        method();
        expect(viewModel.instance.reify).toHaveBeenCalled();
        expect(viewModel.instance.refresh).toHaveBeenCalled();
      });
    });
  });

  describe('trigger_upload() method', function () {
    let uploadFilesDfd;
    let createModelDfd;
    let el;

    beforeEach(function () {
      el = jasmine.createSpyObj(['data', 'trigger']);
      uploadFilesDfd = can.Deferred();
      spyOn(pickerUtils, 'uploadFiles').and.returnValue(uploadFilesDfd);
    });

    it('sets "isUploading" flag to true', function () {
      viewModel.attr('isUploading', false);

      viewModel.trigger_upload(viewModel, el);

      expect(viewModel.attr('isUploading')).toBe(true);
    });

    describe('sets "isUploading" flag to false', function () {
      beforeEach(function () {
        createModelDfd = can.Deferred();
        viewModel.attr('isUploading', true);
        spyOn(viewModel, 'beforeCreateHandler');
        spyOn(viewModel, 'createDocumentModel').and.returnValue(createModelDfd);
      });

      it('when uploadFiles() was failed', function () {
        uploadFilesDfd.reject();

        viewModel.trigger_upload(viewModel, el);

        expect(viewModel.attr('isUploading')).toBe(false);
      });

      it('after createDocumentModel() success', function () {
        uploadFilesDfd.resolve();
        createModelDfd.resolve([]);

        viewModel.trigger_upload(viewModel, el);

        expect(viewModel.attr('isUploading')).toBe(false);
      });

      it('when createDocumentModel() was failed', function () {
        uploadFilesDfd.resolve();
        createModelDfd.reject();

        viewModel.trigger_upload(viewModel, el);

        expect(viewModel.attr('isUploading')).toBe(false);
      });
    });
  });

  describe('trigger_upload_parent() method', function () {
    let uploadFilesDfd;
    let parentFolderDfd;
    let el;
    let parentFolderStub;

    beforeEach(function () {
      el = jasmine.createSpyObj(['data', 'trigger']);
      parentFolderStub = {id: 'id'};
      parentFolderDfd = can.Deferred();
      uploadFilesDfd = can.Deferred();

      spyOn(pickerUtils, 'findGDriveItemById').and.returnValue(parentFolderDfd);
      spyOn(pickerUtils, 'uploadFiles').and.returnValue(uploadFilesDfd);
    });

    it('sets "isUploading" flag to true', function () {
      parentFolderDfd.resolve(parentFolderStub);
      viewModel.attr('isUploading', false);

      viewModel.trigger_upload_parent(viewModel, el);

      expect(viewModel.attr('isUploading')).toBe(true);
    });

    describe('sets "isUploading" flag to false', function () {
      beforeEach(function () {
        viewModel.attr('isUploading', true);
        spyOn(viewModel, 'beforeCreateHandler');
      });

      it('after uploadFiles() success', function () {
        spyOn(viewModel, 'createDocumentModel')
          .and.returnValue(can.Deferred().resolve());
        parentFolderDfd.resolve(parentFolderStub);
        uploadFilesDfd.resolve();

        viewModel.trigger_upload_parent(viewModel, el);

        expect(viewModel.attr('isUploading')).toBe(false);
      });

      it('when uploadFiles() was failed', function () {
        parentFolderDfd.resolve(parentFolderStub);
        uploadFilesDfd.reject();

        viewModel.trigger_upload_parent(viewModel, el);

        expect(viewModel.attr('isUploading')).toBe(false);
      });
    });
  });
});
