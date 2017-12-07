/* !
 Copyright (C) 2017 Google Inc., authors, and contributors
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../../custom-attributes/custom-attributes-actions';
import '../../object-state-toolbar/object-state-toolbar';
import template from './controls-toolbar.mustache';

(function (can, GGRC) {
  'use strict';

  can.Component.extend({
    tag: 'assessment-controls-toolbar',
    template: template,
    viewModel: {
      instance: null,
      verifiers: [],
      onStateChange: function (event) {
        this.dispatch({
          type: 'onStateChange',
          state: event.state,
          undo: event.undo,
        });
      },
    },
  });
})(window.can, window.GGRC, window.CMS);
