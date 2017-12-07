/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './custom-attributes-actions.mustache';

(function (can) {
  'use strict';

  GGRC.Components('localCustomAttributesActions', {
    tag: 'custom-attributes-actions',
    template: template,
    viewModel: {
      formEditMode: false,
      edit: function () {
        this.attr('formEditMode', true);
      }
    }
  });
})(window.can);
