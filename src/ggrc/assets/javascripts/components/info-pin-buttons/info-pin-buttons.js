/*!
    Copyright (C) 2017 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import template from './info-pin-buttons.mustache';

(function (can) {
  'use strict';

  GGRC.Components('infoPinButtons', {
    tag: 'info-pin-buttons',
    template: template,
    viewModel: {
      onChangeMaximizedState: null,
      onClose: null,
      define: {
        maximized: {
          type: 'boolean',
          'default': false
        }
      },
      toggleSize: function (el, ev) {
        var maximized = !this.attr('maximized');
        var onChangeMaximizedState =
           Mustache.resolve(this.onChangeMaximizedState);
        ev.preventDefault();

        onChangeMaximizedState(maximized);

        // Add in a callback queue
        // for executing other
        // handlers in the first place.
        // Without it CanJS will ignore them
        setTimeout(function () {
          this.attr('maximized', maximized);
        }.bind(this), 0);
      },
      close: function (el, ev) {
        var onClose = Mustache.resolve(this.onClose);
        $(el).find('[rel="tooltip"]').tooltip('hide');
        ev.preventDefault();
        onClose();
      }
    }
  }, true);
})(window.can);
