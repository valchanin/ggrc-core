/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import '../release-notes-modal/release-notes-modal';

import template from './release-notes-menu-item.mustache';
import DisplayPrefs from '../../models/local-storage/display-prefs';

const viewModel = can.Map.extend({
  define: {
    version: {
      type: 'string',
      value: GGRC.config.VERSION,
    },
  },
  state: {
    open: false,
  },
  extraCssClass: 'release-notes',
  open(ev) {
    this.attr('state.open', true);
  },
});

const events = {
  async inserted(el) {
    const displayPrefs = await DisplayPrefs.getSingleton();

    const savedVersion = displayPrefs.getReleaseNotesDate();

    if (RELEASE_NOTES_DATE !== savedVersion) {
      displayPrefs.setReleaseNotesDate(RELEASE_NOTES_DATE);
      this.viewModel.open();
    }
  },
};

export default can.Component.extend({
  tag: 'release-notes-menu-item',
  template,
  viewModel,
  events,
});
