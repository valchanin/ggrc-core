/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, GGRC, CMS, $) {
  'use strict';

  GGRC.Components('unmapPersonButton', {
    tag: 'unmap-person-button',
    viewModel: {
      destination: {},
      source: {},
      unmapInstance: function () {
        var objectPerson = this.getObjectMapping();
        var userRole = this.getRoleMapping();

        var dfds = [this.deleteObject(userRole),
          this.deleteObject(objectPerson)];

        $.when.apply($, dfds)
          .done(function () {
            this.attr('destination').dispatch('refreshInstance');
            can.trigger('unmap', {params: [
              this.attr('source'),
              this.attr('destination')]});
          }.bind(this));
      },
      getObjectMapping: function () {
        var sources = this.attr('source.object_people');
        var destinations = this.attr('destination.object_people');
        var mapping;
        destinations = destinations
          .map(function (item) {
            return item.id;
          });
        sources = sources
          .map(function (item) {
            return item.id;
          });
        mapping = destinations
          .filter(function (dest) {
            return sources.indexOf(dest) > -1;
          })[0];
        mapping = mapping ? {id: mapping} : {};
        return new CMS.Models.ObjectPerson(mapping);
      },
      getRoleMapping: function () {
        var contextId = this.attr('destination.context.id');
        var roles = this.attr('source.user_roles');

        roles = roles.map(function (role) {
          return new CMS.Models.UserRole({id: role.id});
        }).filter(function (role) {
          return role.context_id === contextId;
        });

        return roles.length ? roles[0] : new CMS.Models.UserRole({});
      },
      deleteObject: function (obj) {
        var deferred = can.Deferred();
        obj
          .refresh()
          .then(function (item) {
            item
              .destroy()
              .then(function () {
                deferred.resolve();
              });
          });

        return deferred;
      }
    },
    events: {
      click: function () {
        this.viewModel.unmapInstance();
      }
    }
  });
})(window.can, window.GGRC, window.CMS, window.can.$);
