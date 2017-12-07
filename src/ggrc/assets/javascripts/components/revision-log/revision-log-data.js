/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './revision-log-data.mustache';

var viewModel = can.Map.extend({
  data: null,
  isLoading: false,
  define: {
    isObject: {
      type: 'boolean',
      get: function () {
        return _.isObject(this.attr('data'));
      }
    }
  }
});

GGRC.Components('revisionLogData', {
  tag: 'revision-log-data',
  template: template,
  viewModel: viewModel
});
