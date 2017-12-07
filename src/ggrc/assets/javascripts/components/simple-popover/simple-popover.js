/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './simple-popover.mustache';

(function (can, GGRC) {
  'use strict';

  can.Component.extend({
    tag: 'simple-popover',
    template: template,
    viewModel: {
      extraCssClass: '@',
      buttonText: '',
      open: false,
      show: function () {
        this.attr('open', true);
      },
      hide: function () {
        this.attr('open', false);
      }
    }
  });
})(window.can, window.GGRC);
