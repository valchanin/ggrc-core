/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './loading-status.mustache';

(function (can, GGRC) {
  'use strict';

  GGRC.Components('loadingStatus', {
    tag: 'loading-status',
    template: template,
    viewModel: {
      define: {
        showSpinner: {
          type: 'boolean',
          value: false
        },
        alwaysShowText: {
          type: 'boolean',
          value: false
        },
        isLoading: {
          type: 'boolean',
          value: false
        }
      },
      loadingText: '@'
    }
  });
})(window.can, window.GGRC);
