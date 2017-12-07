/*
 Copyright (C) 2017 Google Inc., authors, and contributors
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../related-objects/related-people-access-control';
import '../related-objects/related-people-access-control-group';
import '../people/editable-people-group';
import template from './custom-roles.mustache';

(function (can, GGRC) {
  'use strict';

  var tag = 'custom-roles';

  GGRC.Components('customRoles', {
    tag: tag,
    template: template,
    viewModel: {
      instance: {},
      updatableGroupId: null,
      includeRoles: [],
      excludeRoles: [],
      conflictRoles: [],
      orderOfRoles: [],
      save: function (args) {
        var self = this;
        this.attr('updatableGroupId', args.groupId);
        this.attr('instance').save()
          .then(function () {
            self.attr('instance').dispatch('refreshInstance');
            self.attr('updatableGroupId', null);
          });
      },
    },
  });
})(window.can, window.GGRC);
