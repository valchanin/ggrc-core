/*
  Copyright (C) 2018 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Component from '../file-picker';
import {getComponentVM} from '../../../../js_specs/spec_helpers';
import * as pickerUtils from '../../../plugins/utils/gdrive-picker-utils';

describe('FilePicker component', ()=> {
  let viewModel;
  beforeEach(()=> {
    viewModel = getComponentVM(Component);
    viewModel.attr('instance', {});
  });

  describe('showAttach getter', ()=> {
    it('returns true if title is empty', ()=> {
      viewModel.attr('instance.title', null);

      let result = viewModel.attr('showAttach');

      expect(result).toBe(true);
    });

    it('returns false if title is not empty', ()=> {
      viewModel.attr('instance.title', 'title');

      let result = viewModel.attr('showAttach');

      expect(result).toBe(false);
    });
  });

  describe('pickFile() method', ()=> {
    let uploadFilesDfd;

    beforeEach(()=> {
      uploadFilesDfd = can.Deferred();
      spyOn(pickerUtils, 'uploadFiles').and.returnValue(uploadFilesDfd);
    });

    it('turns on "loading" flag', ()=> {
      viewModel.attr('loading', false);

      viewModel.pickFile();

      expect(viewModel.attr('loading')).toBe(true);
    });

    it('calls uploadFiles', ()=> {
      viewModel.pickFile();

      expect(pickerUtils.uploadFiles).toHaveBeenCalled();
    });

    it('turns off "loading" flag after uploading complete', (done)=> {
      viewModel.pickFile();
      viewModel.attr('loading', true);

      uploadFilesDfd.resolve([{}]).then(()=> {
        expect(viewModel.attr('loading')).toBe(false);
        done();
      });
    });

    it('updates instance object with data from picker', (done)=> {
      let files = [{
        title: 'title',
        id: 'id',
      }];
      viewModel.pickFile();

      uploadFilesDfd.resolve(files).then(()=> {
        expect(viewModel.attr('instance.title')).toBe('title');
        expect(viewModel.attr('instance.source_gdrive_id')).toBe('id');
        done();
      });
    });
  });

  describe('unpickFile() method', ()=> {
    it('erases instance object data', ()=> {
      viewModel.attr('instance', {
        title: 'title',
        source_gdrive_id: 'id',
        created_at: 'created_at',
      });

      viewModel.unpickFile();

      expect(viewModel.attr('instance.title')).toBeUndefined();
      expect(viewModel.attr('instance.source_gdrive_id')).toBeUndefined();
      expect(viewModel.attr('created_at')).toBeUndefined();
    });
  });
});
