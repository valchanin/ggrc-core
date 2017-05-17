/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

describe('GGRC.Components.gDrivePickerLauncher', function () {
  'use strict';

  var Component;
  var events;
  var viewModel;

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

      viewModel.onClickHandler();

      expect(viewModel.confirmationCallback).toHaveBeenCalled();
    });

    it('pass callbackResult to $.when()', function () {
      var dfd = $.Deferred();
      var thenSpy = jasmine.createSpy('then');
      spyOn(viewModel, 'confirmationCallback').and.returnValue(dfd);
      spyOn($, 'when').and.returnValue({
        then: thenSpy
      });

      viewModel.onClickHandler();

      expect($.when).toHaveBeenCalledWith(dfd);
      expect(thenSpy).toHaveBeenCalled();
    });

    it('pass null to $.when() when callback is not provided', function () {
      var thenSpy = jasmine.createSpy('then');
      spyOn($, 'when').and.returnValue({
        then: thenSpy
      });

      viewModel.onClickHandler();

      expect($.when).toHaveBeenCalledWith(null);
      expect(thenSpy).toHaveBeenCalled();
    });
  });

  describe('events', function () {
    describe('"{viewModel} modal:success" handler', function () {
      var method;
      var that;

      beforeEach(function () {
        that = {
          viewModel: viewModel
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
});
