/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, $) {
  'use strict';

  GGRC.Components('objectSearch', {
    tag: 'object-search',
    template: can.view(GGRC.mustache_path +
      '/components/object-search/object-search.mustache'),
    viewModel: function () {
      return GGRC.VM.ObjectOperationsBaseVM.extend({
        object: 'MultitypeSearch',
        type: 'Program',
        availableTypes: function () {
          var types = GGRC.Mappings.getMappingTypes(
            this.attr('object'),
            ['TaskGroupTask', 'TaskGroup', 'CycleTaskGroupObjectTask'],
            []);
          return types;
        },
        resultsRequested: false,
        onSubmit: function () {
          this.attr('resultsRequested', true);
          this._super();
        }
      });
    },
    helpers: {
      displayCount: function (countObserver) {
        var count = countObserver();
        if (count) {
          return '(' + count + ')';
        }
      }
    }
  });
})(window.can, window.can.$);
