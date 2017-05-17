/*!
  Copyright (C) 2017 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

describe('GGRC.Components.assessmentAttachmentsList', function () {
  'use strict';

  var viewModel;

  beforeEach(function () {
    viewModel = GGRC.Components.getViewModel('assessmentAttachmentsList');
    viewModel.attr('instance', new CMS.Models.Assessment());
  });

  describe('itemsUploadedCallback() method', function () {
    it('dispatches "refreshInstance" event', function () {
      spyOn(viewModel.instance, 'dispatch');
      viewModel.itemsUploadedCallback();

      expect(viewModel.instance.dispatch)
        .toHaveBeenCalledWith('refreshInstance');
    });

    it('does not throw error if instance is not provided', function () {
      viewModel.removeAttr('instance');

      expect(viewModel.itemsUploadedCallback.bind(viewModel))
        .not.toThrowError();
    });
  });

  describe('confirmationCallback() method', function () {
    it('returns $.Deferred.promise if instance is not in "In Progress" state',
    function () {
      var dfd = $.Deferred();
      var result;
      viewModel.instance.status = 'Ready for Review';
      spyOn($, 'Deferred').and.returnValue(dfd);

      result = viewModel.confirmationCallback();

      expect(result).toBe(dfd.promise());
    });

    it('returns null if instance is in "In Progress" state', function () {
      var result;
      viewModel.instance.status = 'In Progress';

      result = viewModel.confirmationCallback();

      expect(result).toBe(null);
    });

    it('initializes confirmation modal with correct options', function () {
      viewModel.instance.status = 'Ready for Review';
      spyOn(GGRC.Controllers.Modals, 'confirm');

      viewModel.confirmationCallback();

      expect(GGRC.Controllers.Modals.confirm).toHaveBeenCalledWith({
        modal_title: 'Confirm moving Assessment to "In Progress"',
        modal_description: 'You are about to move Assesment from "' +
          'Ready for Review' +
          '" to "In Progress" - are you sure about that?',
        button_view: GGRC.mustache_path + '/modals/prompt_buttons.mustache'
      }, jasmine.any(Function), jasmine.any(Function));
    });

    it('resolves Deferred if modal has been confirmed', function () {
      var result;
      viewModel.instance.status = 'Ready for Review';
      spyOn(GGRC.Controllers.Modals, 'confirm').and.callFake(
      function (options, confirm, cancel) {
        confirm();
      });

      result = viewModel.confirmationCallback();

      expect(result.state()).toBe('resolved');
    });

    it('rejects Deferred if modal has been canceled', function () {
      var result;
      viewModel.instance.status = 'Ready for Review';
      spyOn(GGRC.Controllers.Modals, 'confirm').and.callFake(
      function (options, confirm, cancel) {
        cancel();
      });

      result = viewModel.confirmationCallback();

      expect(result.state()).toBe('rejected');
    });
  });
});
