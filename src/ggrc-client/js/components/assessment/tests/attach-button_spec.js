/*
  Copyright (C) 2018 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import * as gDriveUtils from '../../../plugins/utils/gdrive-picker-utils';

describe('GGRC.Components.attachButton', function () {
  'use strict';

  let viewModel;

  beforeEach(function () {
    viewModel = GGRC.Components.getViewModel('attachButton');
    viewModel.attr('instance', new CMS.Models.Assessment());
  });

  describe('refresh() method', function () {
    it('dispatches "refreshInstance" event', function () {
      spyOn(viewModel.instance, 'dispatch');
      viewModel.refresh();

      expect(viewModel.instance.dispatch)
        .toHaveBeenCalledWith('refreshInstance');
    });

    it('does not throw error if instance is not provided', function () {
      viewModel.removeAttr('instance');

      expect(viewModel.refresh.bind(viewModel))
        .not.toThrowError();
    });
  });

  describe('checkFolder() method', function () {
    it('should set isFolderAttached to true when folder is attached',
      function () {
        viewModel.attr('isFolderAttached', false);
        viewModel.attr('instance.folder', 'gdrive_folder_id');

        spyOn(viewModel, 'findFolder').and
          .returnValue(can.Deferred().resolve({}));

        viewModel.checkFolder();
        expect(viewModel.attr('isFolderAttached')).toBe(true);
      });

    it('should set isFolderAttached to false when folder is not attached',
      function () {
        viewModel.attr('isFolderAttached', true);
        viewModel.attr('instance.folder', null);

        spyOn(viewModel, 'findFolder').and
          .returnValue(can.Deferred().resolve());

        viewModel.checkFolder();
        expect(viewModel.attr('isFolderAttached')).toBe(false);
      });

    it('set correct isFolderAttached if instance refreshes during ' +
      'request to GDrive', function () {
      let dfd = can.Deferred();
      spyOn(gDriveUtils, 'findGDriveItemById').and.returnValue(dfd);

      viewModel.attr('instance.folder', 'gdrive_folder_id');
      viewModel.checkFolder(); // makes request to GDrive

      // instance is refreshed and folder becomes null
      viewModel.attr('instance.folder', null);
      viewModel.checkFolder();

      // resolve request to GDrive after instance refreshing
      dfd.resolve({folderId: 'gdrive_folder_id'});

      expect(viewModel.attr('isFolderAttached')).toBe(false);
    });
  });
});
