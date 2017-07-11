/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, $) {
  'use strict';

  GGRC.Models.MapperModel = can.Map.extend({
    define: {
      types: {
        get: function () {
          var exclude = [];
          var include = [];
          var snapshots = GGRC.Utils.Snapshots;
          if (this.attr('searchOnly')) {
            include = ['TaskGroupTask', 'TaskGroup',
              'CycleTaskGroupObjectTask'];
          } else {
            exclude = snapshots.inScopeModels;
          }
          return GGRC.Mappings.getMappingTypes(
            this.attr('object'), include, exclude);
        }
      },
      parentInstance: {
        get: function () {
          return CMS.Models
            .get_instance(this.attr('object'), this.attr('join_object_id'));
        }
      },
      useSnapshots: {
        get: function () {
          return GGRC.Utils.Snapshots.isInScopeModel(this.attr('object')) ||
            // In case Assessment generation - use Snapshot Objects
            this.attr('assessmentGenerator');
        }
      }
    },
    type: 'Control', // We set default as Control
    filter: '',
    statusFilter: '',
    object: '',
    model: {},
    bindings: {},
    is_loading: false,
    is_saving: false,
    assessmentTemplate: '',
    searchOnly: false,
    join_object_id: '',
    selected: [],
    entries: [],
    options: [],
    newEntries: [],
    relevant: [],
    submitCbs: $.Callbacks(),
    afterSearch: false,
    afterShown: function () {
      this.onSubmit();
    },
    allowedToCreate: function () {
      var isSearch = this.attr('searchOnly');
      // Don't allow to create new instances for "In Scope" Objects
      var isInScopeModel =
        GGRC.Utils.Snapshots.isInScopeModel(this.attr('object'));
      return !isSearch && !isInScopeModel;
    },
    showWarning: function () {
      // Never show warning for In Scope Objects
      if (GGRC.Utils.Snapshots.isInScopeModel(this.attr('object'))) {
        return false;
      }
      // In case we generate assessments or in search only mode this should be false no matter what objects should be mapped to assessments
      if (this.attr('assessmentGenerator') || this.attr('searchOnly')) {
        return false;
      }
      return GGRC.Utils.Snapshots.isSnapshotParent(this.attr('object')) ||
        GGRC.Utils.Snapshots.isSnapshotParent(this.attr('type'));
    },
    modelFromType: function (type) {
      var types = _.reduce(_.values(
        this.attr('types')), function (memo, val) {
        if (val.items) {
          return memo.concat(val.items);
        }
        return memo;
      }, []);
      return _.findWhere(types, {value: type});
    },
    onSubmit: function () {
      this.attr('submitCbs').fire();
      this.attr('afterSearch', true);
    }
  });
})(window.can, window.can.$);
