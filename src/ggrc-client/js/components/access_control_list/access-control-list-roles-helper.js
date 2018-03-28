/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../custom-roles/custom-roles-modal';
import {getRolesForType} from '../../plugins/utils/acl-utils';
import template from './access-control-list-roles-helper.mustache';

export default GGRC.Components('accessControlListRolesHelper', {
  tag: 'access-control-list-roles-helper',
  template,
  viewModel: {
    instance: {},
    isNewInstance: false,
    isProposal: false,
    includeRoles: [],
    excludeRoles: [],
    readOnly: false,
    orderOfRoles: [],
    setAutoPopulatedRoles: function () {
      let instance = this.attr('instance');
      let autoPopulatedRoles =
        _.filter(getRolesForType(instance.class.model_singular), {
          default_to_current_user: true,
        });

      if (!autoPopulatedRoles.length) {
        return;
      }

      if (!instance.attr('access_control_list')) {
        instance.attr('access_control_list', []);
      }

      autoPopulatedRoles.forEach(function (role) {
        let existingRole = _.find(
          instance.attr('access_control_list'),
          {ac_role_id: role.id});

        if (!existingRole) {
          instance.attr('access_control_list').push({
            ac_role_id: role.id,
            person: {type: 'Person', id: GGRC.current_user.id},
          });
        }
      });
    },
  },
  events: {
    inserted: function () {
      if (this.viewModel.attr('isNewInstance')) {
        this.viewModel.setAutoPopulatedRoles();
      }
    },
  },
});
