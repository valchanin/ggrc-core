/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Cacheable from '../cacheable';

(function (GGRC, can) {
  /*  SearchListLoader
   *  - handles search relationships
   *
   *  - listens to:
   *      - model.created
   *      - model.destroyed
   *      - not implemented:
   *        - instance.change(object_attr)
   */
  GGRC.ListLoaders.BaseListLoader('GGRC.ListLoaders.SearchListLoader', {}, {
    init: function (queryFunction, observeTypes) {
      this._super();
      this.observe_types = observeTypes && observeTypes.split(',');
      this.query_function = queryFunction;
    },
    init_listeners: function (binding) {
      let model = Cacheable;
      let that = this;

      model.bind('created', function (ev, mapping) {
        if (mapping instanceof model) {
          if (_.includes(that.observe_types, mapping.type)) {
            that._refresh_stubs(binding);
          }
        }
      });

      model.bind('destroyed', function (ev, mapping) {
        if (mapping instanceof model)
          that.remove_instance_from_mapping(binding, mapping);
      });

      // FIXME: This is only needed in DirectListLoader, right?
      model.bind('orphaned', function (ev, mapping) {
        if (mapping instanceof model)
          that.remove_instance_from_mapping(binding, mapping);
      });
    },
    is_valid_mapping: function (binding, mapping) {
      return true;
    },
    filter_and_insert_instances_from_mappings: function (binding, mappings) {
      let self = this;
      let matchingMappings;

      matchingMappings = can.map(can.makeArray(mappings), function (mapping) {
        if (self.is_valid_mapping(binding, mapping))
          return mapping;
      });
      return this.insert_instances_from_mappings(binding, matchingMappings);
    },
    insert_instances_from_mappings: function (binding, mappings) {
      let self = this;
      let newResults;

      newResults = can.map(can.makeArray(mappings), function (mapping) {
        return self.get_result_from_mapping(binding, mapping);
      });
      this.insert_results(binding, newResults);
    },
    remove_instance_from_mapping: function (binding, mapping) {
      let instance;
      let result;
      if (this.is_valid_mapping(binding, mapping)) {
        instance = this.get_instance_from_mapping(binding, mapping);
        result = this.find_result_from_mapping(binding, mapping);
        if (instance)
          this.remove_instance(binding, instance, result);
      }
    },
    get_result_from_mapping: function (binding, mapping) {
      return this.make_result({
        instance: mapping,
        mappings: [{
          instance: true,
          mappings: [],
          binding: binding,
        }],
        binding: binding,
      });
    },
    get_instance_from_mapping: function (binding, mapping) {
      return mapping;
    },
    find_result_from_mapping: function (binding, mapping) {
      let result;
      let resultInd;

      for (resultInd = 0; resultInd < binding.list.length; resultInd++) {
        result = binding.list[resultInd];
        if (result.instance === mapping)
          // DirectListLoader can't have multiple mappings
          return result.mappings[0];
      }
    },
    _refresh_stubs: function (binding) {
      let objectJoinAttr = ('search_' + (this.object_join_attr ||
      binding.instance.constructor.table_plural));
      let mappings = binding.instance[objectJoinAttr] &&
        binding.instance[objectJoinAttr].reify();
      let self = this;
      let result;

      if (mappings) {
        this.insert_instances_from_mappings(binding, mappings);
        result = new $.Deferred().resolve(mappings);
      } else {
        result = this.query_function(binding);
        result.pipe(function (mappings) {
          can.each(mappings, function (entry, i) {
            let _class = (can.getObject('CMS.Models.' + entry.type) ||
            can.getObject('GGRC.Models.' + entry.type));
            mappings[i] = new _class({id: entry.id});
          });

          // binding.instance.attr(object_join_attr, mappings);
          self.insert_instances_from_mappings(binding, mappings.reify());
          return mappings;
        });
      }
      return result;
    },
    refresh_list: function (binding) {
      return this._refresh_stubs(binding);
    },
  });
})(window.GGRC, window.can);
