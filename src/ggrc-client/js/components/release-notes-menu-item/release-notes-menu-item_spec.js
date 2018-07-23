/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Component from './release-notes-menu-item';
import {getComponentVM} from '../../../js_specs/spec_helpers';
import DisplayPrefs from '../../models/local-storage/display-prefs';

describe('"release-notes-menu-item" component', () => {
  let vm;

  beforeEach(() => {
    vm = getComponentVM(Component);
  });

  describe('open() method', () => {
    it('sets true to "state.open" flag', () => {
      vm.attr('state.open', false);

      vm.open();

      expect(vm.attr('state.open')).toBe(true);
    });
  });

  describe('events', () => {
    let events;
    let handler;

    beforeEach(() => {
      events = Component.prototype.events;
    });

    describe('"inserted" handler', () => {
      let displayPrefs;

      beforeEach(() => {
        handler = events.inserted.bind({viewModel: vm});
        displayPrefs = {
          getReleaseNotesDate: jasmine.createSpy(),
          setReleaseNotesDate: jasmine.createSpy(),
        };
        spyOn(DisplayPrefs, 'getSingleton')
          .and.returnValue(displayPrefs);
        spyOn(vm, 'open');
      });

      describe('if RELEASE_NOTES_DATE not equal to saved date', () => {
        beforeEach(() => {
          displayPrefs.getReleaseNotesDate = jasmine.createSpy()
            .and.returnValue(new Date());
        });

        it('saves RELEASE_NOTES_DATE with display_prefs', async (done) => {
          await handler();

          expect(displayPrefs.setReleaseNotesDate)
            .toHaveBeenCalledWith(RELEASE_NOTES_DATE);
          done();
        });

        it('calls open() method', async (done) => {
          await handler();

          expect(vm.open).toHaveBeenCalled();
          done();
        });
      });

      describe('if RELEASE_NOTES_DATE equal to saved date', () => {
        beforeEach(() => {
          displayPrefs.getReleaseNotesDate = jasmine.createSpy()
            .and.returnValue(RELEASE_NOTES_DATE);
        });

        it('does not change date in display_prefs', async (done) => {
          await handler();

          expect(displayPrefs.setReleaseNotesDate)
            .not.toHaveBeenCalledWith(RELEASE_NOTES_DATE);
          done();
        });

        it('does not call open() method', async (done) => {
          await handler();

          expect(vm.open).not.toHaveBeenCalled();
          done();
        });
      });
    });
  });
});
