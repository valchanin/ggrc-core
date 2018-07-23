/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/
// Disabling some minor eslint rules until major refactoring
/* eslint-disable no-console, id-length */

import CustomAttributeAccess from '../plugins/utils/custom-attribute/custom-attribute-access';
import {
  isSnapshot,
  setAttrs,
} from '../plugins/utils/snapshot-utils';
import {
  resolveDeferredBindings,
} from '../plugins/utils/models-utils';
import resolveConflict from './conflict-resolution/conflict-resolution';
import PersistentNotifier from '../plugins/persistent_notifier';
import RefreshQueue from './refresh_queue';
import tracker from '../tracker';
import Mappings from './mappers/mappings';
import {delayLeavingPageUntil} from '../plugins/utils/current-page-utils';

function makeFindRelated(thistype, othertype) {
  return function (params) {
    if (!params[thistype + '_type']) {
      params[thistype + '_type'] = this.shortName;
    }
    return CMS.Models.Relationship.findAll(params).then(
      function (relationships) {
        let dfds = [];
        let things = new can.Model.List();
        can.each(relationships, function (rel, idx) {
          let dfd;
          if (rel[othertype].selfLink) {
            things.push(rel[othertype]);
          } else {
            dfd = rel[othertype].refresh().then(function (dest) {
              things.splice(idx, 1, dest);
            });
            dfds.push(dfd);
            things.push(dfd);
          }
        });
        return $.when(...dfds).then(function () {
          return things;
        });
      });
  };
}

function dateConverter(date, oldValue, fn, key) {
  let conversion = 'YYYY-MM-DD\\THH:mm:ss\\Z';
  let ret;
  if (typeof date === 'object' && date) {
    date = date.getTime();
  }
  if (typeof date === 'number') {
    date /= 1000;
    conversion = 'X';
  }
  if (typeof date === 'string' && ~date.indexOf('/')) {
    conversion = 'MM/DD/YYYY';
  }
  date = date ? date.toString() : null;
  ret = moment(date, conversion);
  if (!ret.unix()) {
    // invalid date computed. Result of unix() is NaN.
    return undefined;
  }

  if (typeof date === 'string' && ret &&
      //  Don't correct timezone for dates
      !/^\d+-\d+-\d+$/.test(date) && !/^\d+\/\d+\/\d+$/.test(date) &&
      //  Don't correct timezone if `moment.js` has already done it
      !/[-+]\d\d:?\d\d/.test(date)) {
    // Use the UTC offset that was active at the moment in time to correct
    // the date's timezone.
    ret.add(ret.utcOffset(), 'minute');
  }

  if (oldValue && oldValue.getTime &&
    ret && ret.toDate().getTime() === oldValue.getTime()) {
    // avoid changing to new Date object if the value is the same.
    return oldValue;
  }
  return ret ? ret.toDate() : undefined;
}

function makeDateUnpacker(keys) {
  return function (date, oldValue, fn, attr) {
    return can.reduce(keys, function (curr, key) {
      return curr || (date[key] && dateConverter(
        date[key], oldValue, fn, attr));
    }, null) || date;
  };
}

function makeDateSerializer(type, key) {
  let conversion = type === 'date' ?
    'YYYY-MM-DD' :
    'YYYY-MM-DD\\THH:mm:ss\\Z';
  return function (date) {
    let retstr;
    let retval;
    if (date === null || date === undefined) {
      return '';
    }
    if (typeof date !== 'number') {
      date = date.getTime();
    }
    retstr = moment((date / 1000).toString(), 'X');
    if (type !== 'date') {
      retstr = retstr.utc();
    }
    retstr = retstr.format(conversion);
    if (key) {
      retval = {};
      retval[key] = retstr;
    } else {
      retval = retstr;
    }
    return retval;
  };
}

export default can.Model('can.Model.Cacheable', {
  root_object: '',
  attr_list: [
    {
      attr_title: 'Title',
      attr_name: 'title',
      order: 10,
    },
    {
      attr_title: 'Code',
      attr_name: 'slug',
      order: 30,
    },
    {
      attr_title: 'State',
      attr_name: 'status',
      order: 40,
    },
    {
      attr_title: 'Last Updated Date',
      attr_name: 'updated_at',
      order: 70,
    },
    {
      attr_title: 'Last Updated By',
      attr_name: 'modified_by',
      order: 71,
    },
    {
      attr_title: 'Review State',
      attr_name: 'os_state',
      order: 80,
    },
  ],

  root_collection: '',
  model_singular: '',
  model_plural: '',
  table_singular: '',
  table_plural: '',
  title_singular: '',
  title_plural: '',
  findOne: 'GET {href}',

  makeDestroy: function (destroy) {
    return (id) => destroy(id);
  },

  makeFindAll: function (finder) {
    return function (params, success, error) {
      let deferred = can.Deferred();
      let sourceDeferred = finder.call(this, params);
      let self = this;

      deferred.then(success, error);
      sourceDeferred.then(function (sourceData) {
        if (sourceData[self.root_collection + '_collection']) {
          sourceData = sourceData[self.root_collection + '_collection'];
        }
        if (sourceData[self.root_collection]) {
          sourceData = sourceData[self.root_collection];
        }

        if (!sourceData.splice) {
          sourceData = [sourceData];
        }

        self._modelize(sourceData, deferred);
      }, deferred.reject);

      return deferred;
    };
  },

  setup: function (construct, name, statics, prototypes) {
    let staticProps = statics;
    let protoProps = prototypes; // eslint-disable-line
    let overrideFindAll = false;

    // if name for model was not set
    if (typeof name !== 'string') {
      protoProps = statics; // name will be equal to statics
      staticProps = name;
    }

    if (this.fullName === 'can.Model.Cacheable') {
      this.findAll = function () {
        throw new Error(
          'No default findAll() exists for subclasses of Cacheable');
      };
      this.findPage = function () {
        throw new Error(
          'No default findPage() exists for subclasses of Cacheable');
      };
    } else if ((!staticProps || !staticProps.findAll) &&
      this.findAll === can.Model.Cacheable.findAll) {
      if (this.root_collection) {
        this.findAll = 'GET /api/' + this.root_collection;
      } else {
        overrideFindAll = true;
      }
    }
    if (this.root_collection) {
      this.model_plural = staticProps.model_plural || this.root_collection
        .replace(/(?:^|_)([a-z])/g, function (s, l) {
          return l.toUpperCase();
        });

      this.title_plural = staticProps.title_plural || this.root_collection
        .replace(/(^|_)([a-z])/g, function (s, u, l) {
          return (u ? ' ' : '') + l.toUpperCase();
        });
      this.table_plural = staticProps.table_plural || this.root_collection;
    }
    if (this.root_object) {
      this.model_singular = staticProps.model_singular || this.root_object
        .replace(/(?:^|_)([a-z])/g, function (s, l) {
          return l.toUpperCase();
        });
      this.title_singular = staticProps.title_singular || this.root_object
        .replace(/(^|_)([a-z])/g, function (s, u, l) {
          return (u ? ' ' : '') + l.toUpperCase();
        });
      this.table_singular = staticProps.table_singular || this.root_object;
    }

    if (!can.isFunction(this.findAll)) {
      this.findPage = this.makeFindPage(this.findAll);
    }

    // Prevent event "bleeding" from other members of the Cacheable tree.
    // This fix causes breakages in places where we're expecting model class
    //  events not to be isolated (like in the LHN controller).
    //  I've submitted a fix to CanJS for this but it remains to be seen
    //  whether it gets in and when.  --BM 3/4/14
    // this.__bindEvents = {};

    let that = this;

    if (staticProps.mixins) {
      can.each(staticProps.mixins, function (mixin) {
        let _mixin = mixin;
        if (typeof _mixin === 'string') {
          _mixin = can.getObject(_mixin, CMS.Models.Mixins);
        }
        if (_mixin) {
          _mixin.add_to(that);
        } else {
          throw new Error('Error: Cannot find mixin ' +
            mixin + ' for class ' + that.fullName);
        }
      });
      delete this.mixins;
    }

    let ret = this._super(...arguments);
    if (overrideFindAll) {
      this.findAll = can.Model.Cacheable.findAll;
    }

    // set up default attribute converters/serializers for all classes
    can.extend(this.attributes, {
      created_at: 'datetime',
      updated_at: 'datetime',
    });

    return ret;
  },

  init: function () {
    let idKey = this.id;
    let _update = this.update;
    let _create = this.create;
    this.bind('created', function (ev, newObj) {
      let cache = can.getObject('cache', newObj.constructor, true);
      if (newObj[idKey] || newObj[idKey] === 0) {
        if (!isSnapshot(newObj)) {
          cache[newObj[idKey]] = newObj;
        }
        if (cache[undefined] === newObj) {
          delete cache[undefined];
        }
      }
    });
    this.bind('destroyed', function (ev, oldObj) {
      delete can.getObject('cache', oldObj.constructor, true)[oldObj[idKey]];
    });

    // FIXME:  This gets set up in a chain of multiple calls to the function defined
    //  below when the update endpoint isn't set in the model's static config.
    //  This leads to conflicts not actually rejecting because on the second go-round
    //  the local and remote objects look the same.  --BM 2015-02-06
    this.update = function (id, params) {
      let ret = _update
        .call(this, id, this.process_args(params))
        .then(resolveDeferredBindings,
          function (xhr) {
            if (xhr.status === 409) {
              return resolveConflict(xhr, this.findInCacheById(id));
            }
            return xhr;
          }.bind(this)
        );
      delete ret.hasFailCallback;
      return ret;
    };
    this.create = function (params) {
      let ret = _create
        .call(this, this.process_args(params))
        .then(resolveDeferredBindings);
      delete ret.hasFailCallback;
      return ret;
    };

    // Register this type as a custom attributable type if it is one.
    if (this.is_custom_attributable) {
      if (!GGRC.custom_attributable_types) {
        GGRC.custom_attributable_types = [];
      }
      GGRC.custom_attributable_types.push(can.extend({}, this));

      this.validate(
        '_gca_valid',
        function () {
          if (!this._gca_valid) {
            return 'Missing required global custom attribute';
          }
        }
      );
    }

    // register this type as Roleable if applicable
    if (this.isRoleable) {
      if (!GGRC.roleableTypes) {
        GGRC.roleableTypes = [];
      }
      GGRC.roleableTypes.push(can.extend({}, this));
    }
  },

  findInCacheById: function (id) {
    return can.getObject('cache', this, true)[id];
  },

  removeFromCacheById: function (key) {
    return delete this.store[key];
  },

  newInstance: function (args) {
    let cache = can.getObject('cache', this, true);
    let isKeyExists = args && args[this.id];
    let isObjectExists = isKeyExists && cache[args[this.id]];
    let notSnapshot = args && !isSnapshot(args);
    if (isObjectExists && notSnapshot) {
      // cache[args.id].attr(args, false); //CanJS has bugs in recursive merging
      // (merging -- adding properties from an object without removing existing ones
      //  -- doesn't work in nested objects).  So we're just going to not merge properties.
      return cache[args[this.id]];
    }
    return this._super(...arguments);
  },
  process_args: function (args) {
    let pargs = {};
    let obj = pargs;
    let src;
    let goNames;
    if (this.root_object && !(this.root_object in args)) {
      obj = pargs[this.root_object] = {};
    }
    src = args.serialize ? args.serialize() : args;
    goNames = Object.keys(src);
    for (let i = 0; i < (goNames.length || 0); i++) {
      obj[goNames[i]] = src[goNames[i]];
    }
    return pargs;
  },

  findRelated: makeFindRelated('source', 'destination'),
  findRelatedSource: makeFindRelated('destination', 'source'),

  models: function (params) {
    let ms;
    if (params[this.root_collection + '_collection']) {
      params = params[this.root_collection + '_collection'];
    }
    if (params[this.root_collection]) {
      params = params[this.root_collection];
    }
    if (!params || params.length === 0) {
      return new this.List();
    }
    ms = this._super(params);
    if (params instanceof can.Map || params instanceof can.List) {
      params.replace(ms);
      return params;
    }
    return ms;
  },

  _modelize: function (sourceData, deferred) {
    let obsList = new this.List([]);
    let index = 0;
    let self = this;
    function modelizeMS(ms) {
      let item;
      let start;
      let instances = [];
      let models;

      start = Date.now();
      while (sourceData.length > index && (Date.now() - start) < ms) {
        can.batch.start();
        item = sourceData[index];
        index += 1;
        models = self.models([item]);
        instances.push(...models);
        can.batch.stop();
      }
      can.batch.start();
      obsList.push(...instances);
      can.batch.stop();
    }

    // Trigger a setTimeout loop to modelize remaining objects
    (function cb() {
      modelizeMS(100);
      if (sourceData.length > index) {
        setTimeout(cb, 5);
      } else {
        deferred.resolve(obsList);
      }
    })();
  },

  object_from_resource: function (params) {
    let objName = this.root_object;
    if (!params) {
      return params;
    }
    if (typeof objName !== 'undefined' && params[objName]) {
      for (let i in params[objName]) {
        if (params[objName].hasOwnProperty(i)) {
          params.attr
            ? params.attr(i, params[objName][i])
            : (params[i] = params[objName][i]);
        }
      }
      if (params.removeAttr) {
        params.removeAttr(objName);
      } else {
        delete params[objName];
      }
    }
    return params;
  },

  stubs: function (params) {
    return new can.List(can.map(this.models(params), function (instance) {
      if (!instance) {
        return instance;
      }
      return instance.stub();
    }));
  },

  stub: function (params) {
    if (!params) {
      return params;
    }
    return this.model(params).stub();
  },
  model: function (params) {
    let model;
    params = this.object_from_resource(params);
    if (!params) {
      return params;
    }
    if (isSnapshot(params)) {
      this.removeFromCacheById(params[this.id]);
      delete this.cache[params[this.id]];
    }
    model = this.findInCacheById(params[this.id]) ||
      (params.provisional_id &&
        can.getObject('provisional_cache',
          can.Model.Cacheable, true)[params.provisional_id]);
    if (model && !isSnapshot(params)) {
      if (model.provisional_id && params.id) {
        delete can.Model.Cacheable.provisional_cache[model.provisional_id];
        model.removeAttr('provisional_id');
        model.constructor.cache[params.id] = model;
        model.attr('id', params.id);
      }
      if (model.cleanupAcl && params.access_control_list) {
        // Clear ACL to avoid "merge" of arrays.
        // "params" has valid ACL array.
        model.cleanupAcl();
      }
      model.attr(params);
      model.updateCaObjects(params.custom_attribute_values);
    } else {
      model = this._super(params);
    }
    return model;
  },

  convert: {
    date: dateConverter,
    datetime: dateConverter,
    packaged_datetime: makeDateUnpacker(['dateTime', 'date']),
  },
  serialize: {
    datetime: makeDateSerializer('datetime'),
    date: makeDateSerializer('date'),
    packaged_datetime: makeDateSerializer('datetime', 'dateTime'),
  },
  tree_view_options: {
    display_attr_names: ['title', 'status', 'updated_at'],
    mandatory_attr_names: ['title'],
  },
  sub_tree_view_options: {},
  obj_nav_options: {},
  list_view_options: {},

  makeFindPage: function (findAllSpec) {
  /* Create a findPage function that will return a paging object that will
    * provide access to the model items provided in a single page as well
    * as paging capability to retrieve the named pages provided in the
    * response.
    *
    * findPage returns an object with two properties:
    * {this.options.model.root_collection}_collection and paging. The models
    * property will be an array of all model instances in the page retrieved
    * for the collection. The paging property will be an object that can be
    * used to retrieve other named pages from the collection.  The names of
    * pages include first, prev, next, last. Named page properties will
    * either be functions or the null value in the case where there is no
    * link available in the collection under that name.  Paging functions
    * have the same type of return value as the findPage function.
    *
    * This method assumes that findAllSpec is a string like
    * "GET /api/programs". If this assumption is invalid, this function
    * WILL NOT work correctly.
    */
    let parts;
    let method;
    let collectionUrl;
    let baseParams;

    let that = this;

    function makePaginator(paging, baseParams, scope) {
      function getPage(pageName) {
        if (paging[pageName]) {
          return function () {
            // the paging ("next", "prev", etc. URLs already include query
            // string params, thus passing null for them
            return findPageFunc(paging[pageName], null, baseParams, scope);
          };
        }
        return null;
      }

      return {
        count: paging.count,
        total: paging.total,
        first: getPage('first'),
        prev: getPage('prev'),
        next: getPage('next'),
        last: getPage('last'),
        has_next: function () {
          return this.next !== null;
        },
        has_prev: function () {
          return this.prev !== null;
        },
      };
    }

    function findPageFunc(url, data, params, scope) {
      let ajaxOptions = can.extend({
        url: url,
        data: data,
      }, params);

      return can.ajax(ajaxOptions).then(function (response) {
        let collection = response[that.root_collection + '_collection'];
        let paginator = makePaginator(collection.paging, params, scope);
        let ret = {
          paging: paginator,
        };
        ret[scope.root_collection + '_collection'] =
          scope.models(collection[scope.root_collection]);
        return ret;
      });
    }

    if (typeof findAllSpec === 'string') {
      parts = findAllSpec.split(' ');
      method = parts.length === 2 ? parts[0] : 'GET';
      collectionUrl = parts.length === 2 ? parts[1] : parts[0];
    } else if (typeof findAllSpec === 'object') {
      method = findAllSpec.type || 'GET';
      collectionUrl = findAllSpec.url;
    } else {
      return; // TODO make a pager if findAllSpec is a function.
    }

    baseParams = {
      type: method,
      dataType: 'json',
    };

    return function (params) {
      params = params || {};
      if (!params.__page) {
        params.__page = 1;
      }
      if (!params.__page_size) {
        params.__page_size = 20;
      }
      return findPageFunc(collectionUrl, params, baseParams, that);
    };
  },

  get_mapper: function (name) {
    let mapper;
    let mappers = Mappings.get_mappings_for(this.shortName);
    if (mappers) {
      mapper = mappers[name];
      return mapper;
    }
  },
}, {
  init: function () {
    let cache = can.getObject('cache', this.constructor, true);
    let idKey = this.constructor.id;
    setAttrs(this);
    if ((this[idKey] || this[idKey] === 0) &&
      !isSnapshot(this)) {
      cache[this[idKey]] = this;
    }
    this.attr('class', this.constructor);
    this.notifier = new PersistentNotifier({
      name: this.constructor.model_singular,
    });

    if (!this._pending_joins) {
      this.attr('_pending_joins', []);
    }

    if (this.isCustomAttributable()) {
      this._customAttributeAccess = new CustomAttributeAccess(this);
    }
  },
  /**
   * Updates custom attribute objects with help custom
   * attribute values.
   * @param {Object[]} caValues - Custom attribute values.
   */
  updateCaObjects(caValues) {
    if (this.isCustomAttributable() && caValues) {
      this._customAttributeAccess.updateCaObjects(caValues);
    }
  },
  load_custom_attribute_definitions: function () {
    let definitions;
    if (this.attr('custom_attribute_definitions')) {
      return;
    }
    if (GGRC.custom_attr_defs === undefined) {
      GGRC.custom_attr_defs = {};
      console.warn('Missing injected custom attribute definitions');
    }
    definitions = can.map(GGRC.custom_attr_defs, function (def) {
      let idCheck = !def.definition_id || def.definition_id === this.id;
      if (idCheck &&
          def.definition_type === this.constructor.table_singular) {
        return def;
      }
    }.bind(this));
    this.attr('custom_attribute_definitions', definitions);
  },
  /*
    * 1 version:
    * Returns all custom attribute objects owned by instance.
    * @return {CustomAttributeObject[]} - The array contained custom attribute
    *  objects.
    *
    * 2 version:
    * Returns custom attribute object with certain custom attribute id.
    * @param {number} caId(2) - Custom attribute id.
    * @return {CustomAttributeObject|undefined} - Found custom attribute object
    *  otherwise - undefined if it wasn't found.
    *
    * 3 version:
    * Returns filtered array with help options object.
    * @param {object} options -
    * @param {CUSTOM_ATTRIBUTE_TYPE} options.type - Filters array by custom
    *  attribute type.
    * @return {CustomAttributeObject[]} - Filtered custom attriubte object
    *  list.
    *
    * 4 version:
    * Sets value for certain custom attribute object.
    * @param {number|string} caId(4) - Custom attribute id.
    * @param {number|string|boolean} - Value for custom attribute object.
    */
  customAttr(...args) {
    if (!this.isCustomAttributable()) {
      throw Error('This type has not ability to set custom attribute value');
    }

    switch (args.length) {
      case 0: {
        return this._getAllCustomAttr();
      }
      case 1: {
        return this._getCustomAttr(args[0]);
      }
      case 2: {
        this._setCustomAttr(...args);
        break;
      }
    }
  },
  _getAllCustomAttr() {
    return this._customAttributeAccess.read();
  },
  _getCustomAttr(arg) {
    return this._customAttributeAccess.read(arg);
  },
  _setCustomAttr(caId, value) {
    const change = {caId: Number(caId), value};
    this._customAttributeAccess.write(change);
  },
  isCustomAttributable() {
    return this.constructor.is_custom_attributable;
  },
  computed_errors: function () {
    let errors = this.errors();
    if (this.attr('_suppress_errors')) {
      return null;
    }
    return errors;
  },
  computed_unsuppressed_errors: function () {
    return this.errors();
  },
  get_list_counter: function (name) {
    let binding = this.get_binding(name);
    if (!binding) {
      return can.Deferred().reject();
    }
    return binding.refresh_count();
  },

  get_list_loader: function (name) {
    let binding = this.get_binding(name);
    return binding.refresh_list();
  },

  get_mapping: function (name) {
    let binding = this.get_binding(name);
    if (binding) {
      binding.refresh_list();
      return binding.list;
    }
    return [];
  },

  get_mapping_deferred: function (name) {
    return this.get_binding(name).refresh_list();
  },

  get_orphaned_count: function () {
    if (!this.get_binding('orphaned_objects')) {
      return can.Deferred().reject();
    }
    return this.get_list_loader('orphaned_objects').then((list) => {
      function isJoin(mapping) {
        if (mapping.mappings.length > 0) {
          for (let i = 0, child; child = mapping.mappings[i]; i++) {
            if (child = isJoin(child)) {
              return child;
            }
          }
        }
        return mapping.instance &&
          mapping.instance instanceof can.Model.Join &&
          mapping.instance;
      }

      const mappings = [];
      can.each(list, (mapping) => {
        const inst = isJoin(mapping);

        if (inst) {
          mappings.push(inst);
        }
      });

      return mappings.length;
    });
  },

  _get_binding_attr: function (mapper) {
    if (typeof (mapper) === 'string') {
      return '_' + mapper + '_binding';
    }
  },

  // checks if binding exists without throwing debug statements
  // modeled after what get_binding is doing
  has_binding: function (mapper) {
    let binding;
    let mapping;
    let bindingAttr = this._get_binding_attr(mapper);

    if (bindingAttr) {
      binding = this[bindingAttr];
    }

    if (!binding) {
      if (typeof (mapper) === 'string') {
        mapping = this.constructor.get_mapper(mapper);
        if (!mapping) {
          return false;
        }
      } else if (!(mapper instanceof GGRC.ListLoaders.BaseListLoader)) {
        return false;
      }
    }

    return true;
  },

  get_binding: function (mapper) {
    let mapping;
    let binding;
    let bindingAttr = this._get_binding_attr(mapper);

    if (bindingAttr) {
      binding = this[bindingAttr];
    }

    if (!binding) {
      if (typeof (mapper) === 'string') {
      // Lookup and attach named mapper
        mapping = this.constructor.get_mapper(mapper);
        if (!mapping) {
          console.debug(
            'No such mapper:  ' + this.constructor.shortName + '.' + mapper);
        } else {
          binding = mapping.attach(this);
        }
      } else if (mapper instanceof GGRC.ListLoaders.BaseListLoader) {
      // Loader directly provided, so just attach
        binding = mapper.attach(this);
      } else {
        console.debug('Invalid mapper specified:', mapper);
      }
      if (binding && bindingAttr) {
        this[bindingAttr] = binding;
        binding.name = this.constructor.shortName + '.' + mapper;
      }
    }
    return binding;
  },
  refresh: function (params) {
    let dfd;
    let href = this.selfLink || this.href;
    let that = this;

    if (!href) {
      return can.Deferred().reject();
    }
    if (!this._pending_refresh) {
      this._pending_refresh = {
        dfd: can.Deferred(),
        fn: _.throttle(function () {
          let dfd = that._pending_refresh.dfd;
          let stopFn = tracker.start(that.type,
            tracker.USER_JOURNEY_KEYS.API,
            tracker.USER_ACTIONS.LOAD_OBJECT);
          can.ajax({
            url: href,
            params: params,
            type: 'get',
            dataType: 'json',
          })
            .then($.proxy(that, 'cleanupAcl'))
            .then($.proxy(that, 'cleanupCollections'))
            .then($.proxy(that.constructor, 'model'))
            .done(function (response) {
              response.backup();
              stopFn();
              dfd.resolve(...arguments);
            })
            .fail(function () {
              stopFn(true);
              dfd.reject(...arguments);
            })
            .always(function () {
              delete that._pending_refresh;
            });
        }, 1000, {trailing: false}),
      };
    }
    dfd = this._pending_refresh.dfd;
    this._pending_refresh.fn();
    return dfd;
  },
  // TODO: should be refactored and sliced on multiple functions
  serialize: function () {
    let serial = {};
    let fnName;
    let val;
    if (arguments.length) {
      return this._super(...arguments);
    }
    /* Serialize only meaningful properties */
    Object.keys(this._data).forEach(function (name) {
      if (name.startsWith && name.startsWith('_')) {
        return;
      }
      val = this[name];
      if (this.constructor.attributes && this.constructor.attributes[name]) {
        fnName = this.constructor.attributes[name];
        fnName = fnName.substr(fnName.lastIndexOf('.') + 1);
        if (fnName === 'stubs' || fnName === 'get_stubs' ||
        fnName === 'models' || fnName === 'get_instances') {
        // val can be null in some cases
          if (val) {
            serial[name] = val.stubs().serialize();
          }
        } else if (fnName === 'stub' || fnName === 'get_stub' ||
        fnName === 'model' || fnName === 'get_instance') {
          serial[name] = (val ? val.stub().serialize() : null);
        } else {
          serial[name] = val;
        }
      } else if (val && can.isFunction(val.save)) {
        serial[name] = val.stub().serialize();
      } else if (typeof val === 'object' && val !== null && val.length) {
        serial[name] = can.map(val, function (v) {
          let isModel = v && can.isFunction(v.save);
          return isModel ?
            v.stub().serialize() :
            (v && v.serialize) ? v.serialize() : v;
        });
      } else if (!can.isFunction(val)) {
        if (this[name] && this[name].isComputed) {
          serial[name] = val && val.serialize ? val.serialize() : val;
        } else {
          serial[name] = this[name] && this[name].serialize ?
            this[name].serialize() :
            serial[name] = val;
        }
      }
    }.bind(this));
    return serial;
  },
  display_name: function () {
    let displayName = this.title || this.name;

    if (_.isUndefined(displayName)) {
      return '"' + this.type + ' ID: ' + this.id + '" (DELETED)';
    }

    return displayName;
  },
  display_type: function () {
    return this.type;
  },
  autocomplete_label: function () {
    return this.title;
  },
  get_permalink: function () {
    let dfd = can.Deferred();
    let ctor = this.constructor;
    if (!ctor.permalink_options) {
      return dfd.resolve(this.viewLink);
    }
    let poBaseItems = ctor.permalink_options.base.split(':');
    $.when(this.refresh_all(...poBaseItems))
      .then(function (base) {
        return dfd.resolve(_.template(constructor.permalink_options.url)({
          base: base,
          instance: this,
        }));
      }.bind(this));
    return dfd.promise();
  },

  /*
    * Set up a deferred join object update when this object is updated.
    */
  mark_for_update: function (joinAttr, obj, extraAttrs, options) {
    obj = obj.reify ? obj.reify() : obj;
    extraAttrs = _.isEmpty(extraAttrs) ? undefined : extraAttrs;

    this.remove_duplicate_pending_joins(obj);
    this._pending_joins.push({
      how: 'update',
      what: obj,
      through: joinAttr,
      extra: extraAttrs,
      opts: options,
    });
  },
  /*
    * Set up a deferred join object deletion when this object is updated.
    */
  mark_for_deletion: function (joinAttr, obj, extraAttrs, options) {
    obj = obj.reify ? obj.reify() : obj;

    this.remove_duplicate_pending_joins(obj);
    this._pending_joins.push({
      how: 'remove',
      what: obj,
      through: joinAttr,
      opts: options,
    });
  },

  /*
    * Set up a deferred join object creation when this object is updated.
    */
  mark_for_addition: function (joinAttr, obj, extraAttrs, options) {
    obj = obj.reify ? obj.reify() : obj;
    extraAttrs = _.isEmpty(extraAttrs) ? undefined : extraAttrs;

    this.remove_duplicate_pending_joins(obj);
    this._pending_joins.push({
      how: 'add',
      what: obj,
      through: joinAttr,
      extra: extraAttrs,
      opts: options,
    });
  },

  remove_duplicate_pending_joins: function (obj) {
    let joins;
    let len;
    if (!this._pending_joins) {
      this.attr('_pending_joins', []);
    }
    len = this._pending_joins.length;
    joins = _.filter(this._pending_joins, function (val) {
      return val.what !== obj;
    });

    if (len !== joins.length) {
      this.attr('_pending_joins').replace(joins);
    }
  },

  delay_resolving_save_until: function (dfd) {
    return this.notifier.queue(dfd);
  },
  _save: function () {
    let that = this;
    let _super = Array.prototype.pop.call(arguments);
    let isNew = this.isNew();
    let xhr;
    let dfd = this._dfd;
    let preSaveNotifier =
      new PersistentNotifier({name:
      this.constructor.model_singular + ' (pre-save)'});

    that.dispatch('modelBeforeSave');

    if (this.before_save) {
      this.before_save(preSaveNotifier);
    }
    if (isNew) {
      this.attr('provisional_id', 'provisional_' + Date.now());
      can.getObject('provisional_cache',
        can.Model.Cacheable, true)[this.provisional_id] = this;
      if (this.before_create) {
        this.before_create(preSaveNotifier);
      }
    } else {
      if (this.before_update) {
        this.before_update(preSaveNotifier);
      }
    }

    preSaveNotifier.on_empty(function () {
      xhr = _super.apply(that, arguments)
        .then(function (result) {
          if (isNew) {
            that.after_create && that.after_create();
          } else {
            that.after_update && that.after_update();
          }
          that.after_save && that.after_save();
          return result;
        }, function (xhr, status, message) {
          that.save_error && that.save_error(xhr.responseText);
          return new can.Deferred().reject(xhr, status, message);
        })
        .fail(function (response) {
          that.notifier.on_empty(function () {
            dfd.reject(that, response);
          });
        })
        .done(function () {
          that.notifier.on_empty(function () {
            dfd.resolve(that);
          });
        })
        .always(function () {
          that.dispatch('modelAfterSave');
        });

      delayLeavingPageUntil(xhr);
      delayLeavingPageUntil(dfd);
    });
    return dfd;
  },
  save: function () {
    Array.prototype.push.call(arguments, this._super);
    this._dfd = new can.Deferred();
    GGRC.SaveQueue.enqueue(this, arguments);
    return this._dfd;
  },
  refresh_all: function () {
    let props = Array.prototype.slice.call(arguments, 0);

    return RefreshQueue.refresh_all(this, props);
  },
  refresh_all_force: function () {
    let props = Array.prototype.slice.call(arguments, 0);

    return RefreshQueue.refresh_all(this, props, true);
  },
  hash_fragment: function () {
    let type = can.spaceCamelCase(this.type || '')
      .toLowerCase()
      .replace(/ /g, '_');

    return [type, this.id].join('/');
  },
});

/* TODO: hack on can.Observe should be removed or at least placed outside of Cacheable Model Class */
let _oldAttr = can.Observe.prototype.attr;
can.Observe.prototype.attr = function (key, val) {
  if (key instanceof can.Observe) {
    if (arguments[0] === this) {
      return this;
    }
    return _oldAttr.apply(this, [key.serialize()]);
  }
  return _oldAttr.apply(this, arguments);
};

can.Observe.prototype.stub = function () {
  let type;
  let id;

  if (!(this instanceof can.Model || this instanceof can.Stub)) {
    console.debug('.stub() called on non-stub, non-instance object', this);
  }

  if (this instanceof can.Stub) {
    return this;
  }

  if (this instanceof can.Model) {
    type = this.constructor.shortName;
  } else {
    type = this.type;
  }

  if (this.constructor.id) {
    id = this[this.constructor.id];
  } else {
    id = this.id;
  }

  if (!id && id !== 0) {
    return null;
  }

  return can.Stub.get_or_create({
    id: id,
    href: this.selfLink || this.href,
    type: type,
  });
};

can.Observe('can.Stub', {
  get_or_create: function (obj) {
    let id = obj.id;
    let stub;
    let type = obj.type;

    CMS.Models.stub_cache = CMS.Models.stub_cache || {};
    CMS.Models.stub_cache[type] = CMS.Models.stub_cache[type] || {};
    if (!CMS.Models.stub_cache[type][id]) {
      stub = new can.Stub(obj);
      CMS.Models.stub_cache[type][id] = stub;
    }
    return CMS.Models.stub_cache[type][id];
  },
}, {
  init: function () {
    let that = this;
    this._super(...arguments);
    this._instance().bind('destroyed', function (ev) {
      // Trigger propagating `change` event to convey `stub-destroyed` message
      can.trigger(
        that, 'change', ['stub_destroyed', 'stub_destroyed', that, null]);
      delete CMS.Models.stub_cache[that.type][that.id];
    });
  },

  _model: function () {
    return CMS.Models[this.type] || GGRC.Models[this.type];
  },

  _instance: function () {
    if (!this.__instance) {
      this.__instance = this._model().model(this);
    }
    return this.__instance;
  },

  getInstance: function () {
    return this._instance();
  },
});

can.Observe.List.prototype.stubs = function () {
  return new can.Observe.List(can.map(this, function (obj) {
    return obj.stub();
  }));
};

can.Observe.prototype.reify = function () {
  let type;
  let model;

  if (this instanceof can.Model) {
    return this;
  }
  if (!(this instanceof can.Stub)) {
    // console.debug('`reify()` called on non-stub, non-instance object', this);
  }

  type = this.type;
  model = CMS.Models[type] || GGRC.Models[type];

  if (!model) {
    console.debug('`reify()` called with unrecognized type', this);
  } else {
    return model.model(this);
  }
};

can.Observe.List.prototype.reify = function () {
  return new can.Observe.List(can.map(this, function (obj) {
    return obj.reify();
  }));
};
