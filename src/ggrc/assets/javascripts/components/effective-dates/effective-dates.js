/*!
    Copyright (C) 2017 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import '../datepicker/datepicker';
import template from './effective-dates.mustache';

(function (can, GGRC) {
  'use strict';

  GGRC.Components('effective-dates', {
    tag: 'effective-dates',
    template: template,
    scope: {
      instance: null,
      configStartDate: {
        label: 'Effective Date',
        helpText: 'Enter the date this object becomes effective.',
        required: false
      }
    }
  });
})(window.can, window.GGRC);
