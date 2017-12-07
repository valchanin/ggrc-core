/*!
    Copyright (C) 2017 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import template from './add-object-button.mustache';

(function (can) {
  'use strict';

  GGRC.Components('addObjectButton', {
    tag: 'add-object-button',
    template: template,
    viewModel: {
      instance: null,
      linkclass: '@',
      content: '@',
      text: '@',
      singular: '@',
      plural: '@',
      define: {
        noparams: {
          type: 'htmlbool',
          value: false
        }
      }
    }
  });
})(window.can);
