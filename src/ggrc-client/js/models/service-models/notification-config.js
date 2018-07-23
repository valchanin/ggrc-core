/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Cacheable from '../cacheable';

export default Cacheable('CMS.Models.NotificationConfig', {
  root_object: 'notification_config',
  root_collection: 'notification_configs',
  category: 'person',
  findAll: 'GET /api/notification_configs',
  findOne: 'GET /api/notification_configs/{id}',
  create: 'POST /api/notification_configs',
  update: 'PUT /api/notification_configs/{id}',
  destroy: 'DELETE /api/notification_configs/{id}',
  active: 'POST /api/set_active_notifications',

  findActive: function () {
    if (GGRC.current_user === null || GGRC.current_user === undefined) {
      return $.when([]);
    }
    return this.findAll({person_id: GGRC.current_user.id});
  },
  setActive: function (active) {
    let existing_types;
    let all_types;
    let valid_types;

    if (!GGRC.current_user) {
      console.warn('User object is not set.');
      return $.when();
    }

    valid_types = $.map($('input[name=notifications]'), function (input) {
      return input.value;
    });

    return this.findActive().then(function (configs) {
      existing_types = $.map(configs, function (config) {
        return config.notif_type;
      });
      all_types = $.map(valid_types, function (type) {
        let index = existing_types.indexOf(type);
        if (index === -1) {
          // Create a new notificationConfig if it doesn't exist yet
          return new CMS.Models.NotificationConfig({
            person_id: GGRC.current_user.id,
            notif_type: type,
            enable_flag: null,
            context: {id: null},
          });
        }
        return configs[index];
      });
      return $.when(...$.map(all_types, function (config) {
        let enabled = active.indexOf(config.notif_type) !== -1;
        if (config.attr('enable_flag') === enabled) {
          // There was no change to this config object
          return;
        }
        if (!config.id) {
          // This is a new object so no need for refresh()
          config.attr('enable_flag', enabled);
          return config.save();
        }
        return config.refresh().then(function (refreshed_config) {
          refreshed_config.attr('enable_flag', enabled);
          return refreshed_config.save();
        });
      }));
    });
  },
}, {});
