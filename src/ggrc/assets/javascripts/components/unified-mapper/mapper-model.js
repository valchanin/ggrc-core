/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, $) {
  'use strict';

  GGRC.Models.MapperModel = can.Map.extend({
    define: {
      typeGroups: {
        value: {
          entities: {
            name: 'People/Groups',
            items: []
          },
          business: {
            name: 'Assets/Business',
            items: []
          },
          governance: {
            name: 'Governance',
            items: []
          }
        }
      },
      types: {
        get: function () {
          return this.initTypes();
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
    search_only: false,
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
      var isSearch = this.attr('search_only');
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
      if (this.attr('assessmentGenerator') || this.attr('search_only')) {
        return false;
      }
      return GGRC.Utils.Snapshots.isSnapshotParent(this.attr('object')) ||
        GGRC.Utils.Snapshots.isSnapshotParent(this.attr('type'));
    },
    prepareCorrectTypeFormat: function (cmsModel) {
      return {
        category: cmsModel.category,
        name: cmsModel.title_plural,
        value: cmsModel.model_singular,
        singular: cmsModel.model_singular,
        plural: cmsModel.title_plural.toLowerCase().replace(/\s+/, '_'),
        table_plural: cmsModel.table_plural,
        title_singular: cmsModel.title_singular,
        isSelected: cmsModel.model_singular === this.attr('type')
      };
    },
    addFormattedType: function (modelName, groups) {
      var group;
      var type;
      var cmsModel;
      cmsModel = GGRC.Utils.getModelByType(modelName);
      if (!cmsModel || !cmsModel.title_singular ||
        cmsModel.title_singular === 'Reference') {
        return;
      }
      type = this.prepareCorrectTypeFormat(cmsModel);
      group = !groups[type.category] ?
        groups.governance :
        groups[type.category];

      group.items.push(type);
    },
    getModelNamesList: function (object) {
      var exclude = [];
      var include = [];
      var snapshots = GGRC.Utils.Snapshots;
      if (this.attr('search_only')) {
        include = ['TaskGroupTask', 'TaskGroup',
          'CycleTaskGroupObjectTask'];
      } else {
        exclude = snapshots.inScopeModels;
      }
      return GGRC.Mappings
        .getMappingList(object, include, exclude);
    },
    initTypes: function (objectType) {
      var object = objectType || this.attr('object');
      // Can.JS wrap all objects with can.Map by default
      var groups = this.attr('typeGroups').attr();
      var list = this.getModelNamesList(object);

      list.forEach(function (modelName) {
        return this.addFormattedType(modelName, groups);
      }.bind(this));
      return groups;
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
