/*
    Copyright (C) 2017 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import template from './editable-people-group-header.mustache';

(function (can, GGRC) {
  'use strict';

  GGRC.Components('editablePeopleGroupHeader', {
    tag: 'editable-people-group-header',
    template: template,
    viewModel: {
      define: {
        peopleCount: {
          get: function () {
            return this.attr('people.length');
          },
        },
      },
      editableMode: false,
      isLoading: false,
      canEdit: true,
      required: false,
      people: [],
      openEditMode: function () {
        this.dispatch('editPeopleGroup');
      },
    },
  });
})(window.can, window.GGRC);
