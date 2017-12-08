/*
  Copyright (C) 2018 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Component from '../document-file-picker';
import {getComponentVM} from '../../../../js_specs/spec_helpers';
import * as pickerUtils from '../../../plugins/utils/gdrive-picker-utils';

describe('DocumentFilePicker component', ()=> {
  let viewModel;
  beforeEach(()=> {
    viewModel = getComponentVM(Component);
    viewModel.attr('document', {});
  });

  describe('showAttach getter', ()=> {
    it('returns true if title and link are empty', ()=> {
      viewModel.attr('document.title', null);
      viewModel.attr('document.link', null);

      let result = viewModel.attr('showAttach');

      expect(result).toBe(true);
    });

    it('returns true if title is not empty and link is empty', ()=> {
      viewModel.attr('document.title', 'title');
      viewModel.attr('document.link', null);

      let result = viewModel.attr('showAttach');

      expect(result).toBe(true);
    });

    it('returns true if title is empty and link is not empty', ()=> {
      viewModel.attr('document.title', null);
      viewModel.attr('document.link', 'link');

      let result = viewModel.attr('showAttach');

      expect(result).toBe(true);
    });

    it('returns false if title and link are not empty', ()=> {
      viewModel.attr('document.title', 'title');
      viewModel.attr('document.link', 'link');

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

    it('updates document object with data from picker', (done)=> {
      let files = [{
        title: 'title',
        alternateLink: 'link',
      }];
      viewModel.pickFile();

      uploadFilesDfd.resolve(files).then(()=> {
        expect(viewModel.attr('document.title')).toBe('title');
        expect(viewModel.attr('document.link')).toBe('link');
        done();
      });
    });
  });

  describe('unpickFile() method', ()=> {
    it('erases document object data', ()=> {
      viewModel.attr('document', {
        title: 'title',
        link: 'link',
      });

      viewModel.unpickFile();

      expect(viewModel.attr('document.title')).toBe(null);
      expect(viewModel.attr('document.link')).toBe(null);
    });
  });
});
