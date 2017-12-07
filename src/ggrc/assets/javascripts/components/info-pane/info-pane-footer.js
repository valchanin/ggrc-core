/*!
 Copyright (C) 2017 Google Inc., authors, and contributors
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './info-pane-footer.mustache';

(function (can, GGRC) {
  'use strict';

  /**
   * Specific Info Pane Footer Component
   */
  GGRC.Components('infoPaneFooter', {
    tag: 'info-pane-footer',
    template: template,
    viewModel: {
      createdAt: '',
      modifiedAt: '',
      modifiedBy: {}
    }
  });
})(window.can, window.GGRC);
