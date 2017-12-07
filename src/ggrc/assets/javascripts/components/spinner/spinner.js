/*!
    Copyright (C) 2017 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import template from './spinner.mustache';

(function (can) {
  'use strict';

  GGRC.Components('spinner', {
    tag: 'spinner',
    template: template,
    scope: {
      extraCssClass: '@',
      size: '@',
      toggle: null
    }
  });
})(window.can);
