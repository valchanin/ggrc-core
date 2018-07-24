/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import RefreshQueue from '../models/refresh_queue';
import Permission from '../permission';
import {getRolesForType} from '../plugins/utils/acl-utils';
import Mappings from '../models/mappers/mappings';
import * as businessModels from '../models/business-models';

/**
 * A module containing various utility functions.
 */

/**
 * Performs filtering on provided array like instances
 * @param {Array} items - array like instance
 * @param {Function} filter - filtering function
 * @param {Function} selectFn - function to select proper attributes
 * @return {Array} - filtered array
 */
function _applyFilter(items, filter, selectFn) {
  selectFn = selectFn ||
    function (x) {
      return x;
    };
  return Array.prototype.filter.call(items, function (item) {
    return filter(selectFn(item));
  });
}

/**
 * Helper function to create a filtering function
 * @param {Object|null} filterObj - filtering params
 * @return {Function} - filtering function
 */
function _makeTypeFilter(filterObj) {
  function checkIsNotEmptyArray(arr) {
    return arr && Array.isArray(arr) && arr.length;
  }
  return function (type) {
    type = type.toString().toLowerCase();
    if (!filterObj) {
      return true;
    }
    if (checkIsNotEmptyArray(filterObj.only)) {
      // Do sanity transformation
      filterObj.only = filterObj.only.map(function (item) {
        return item.toString().toLowerCase();
      });
      return filterObj.only.indexOf(type) > -1;
    }
    if (checkIsNotEmptyArray(filterObj.exclude)) {
      // Do sanity transformation
      filterObj.exclude = filterObj.exclude.map(function (item) {
        return item.toString().toLowerCase();
      });
      return filterObj.exclude.indexOf(type) === -1;
    }
    return true;
  };
}

function applyTypeFilter(items, filterObj, getTypeSelectFn) {
  let filter = _makeTypeFilter(filterObj);
  return _applyFilter(items, filter, getTypeSelectFn);
}

function isInnerClick(el, target) {
  el = el instanceof $ ? el : $(el);
  return el.has(target).length || el.is(target);
}

function inViewport(el) {
  let bounds;
  let isVisible;

  el = el instanceof $ ? el[0] : el;
  bounds = el.getBoundingClientRect();

  isVisible = window.innerHeight > bounds.bottom &&
  window.innerWidth > bounds.right;

  return isVisible;
}

function formatDate(date, hideTime) {
  let currentTimezone = moment.tz.guess();
  let formats = [
    'YYYY-MM-DD',
    'YYYY-MM-DDTHH:mm:ss',
    'YYYY-MM-DDTHH:mm:ss.SSSSSS',
  ];
  let inst;

  if ( !date ) {
    return '';
  }

  if (typeof date === 'string') {
    // string dates are assumed to be in ISO format

    if (hideTime) {
      return moment.utc(date, formats, true).format('MM/DD/YYYY');
    }
    return moment.utc(date, formats, true)
      .format('MM/DD/YYYY hh:mm:ss A Z');
  }

  inst = moment(new Date(date.isComputed ? date() : date));
  if (hideTime === true) {
    return inst.format('MM/DD/YYYY');
  }
  return inst.tz(currentTimezone).format('MM/DD/YYYY hh:mm:ss A Z');
}

function getPersonInfo(person) {
  const dfd = can.Deferred();
  let actualPerson;

  if (!person || !person.id) {
    dfd.resolve(person);
    return dfd;
  }

  actualPerson = businessModels.Person.store[person.id] || {};
  if (actualPerson.email) {
    dfd.resolve(actualPerson);
  } else {
    actualPerson = new businessModels.Person({id: person.id});
    new RefreshQueue()
      .enqueue(actualPerson)
      .trigger()
      .done((personItem) => {
        personItem = Array.isArray(personItem) ? personItem[0] : personItem;
        dfd.resolve(personItem);
      })
      .fail(function () {
        GGRC.Errors.notifier('error',
          'Failed to fetch data for person ' + person.id + '.');
        dfd.reject();
      });
  }

  return dfd;
}

function getPickerElement(picker) {
  return _.find(_.values(picker), function (val) {
    if (val instanceof Node) {
      return /picker\-dialog/.test(val.className);
    }
    return false;
  });
}

function loadScript(url, callback) {
  let script = document.createElement('script');
  script.type = 'text/javascript';
  if (script.readyState) {
    script.onreadystatechange = function () {
      if (script.readyState === 'loaded' ||
        script.readyState === 'complete') {
        script.onreadystatechange = null;
        callback();
      }
    };
  } else {
    script.onload = function () {
      callback();
    };
  }
  script.src = url;
  document.getElementsByTagName('head')[0].appendChild(script);
}

function hasPending(parentInstance, instance, how) {
  let list = parentInstance._pending_joins;
  how = how || 'add';

  if (!list || !list.length) {
    return false;
  }
  if (list instanceof can.List) {
    list = list.serialize();
  }

  return _.find(list, function (pending) {
    let method = pending.how === how;
    if (!instance) {
      return method;
    }
    return method && pending.what === instance;
  });
}

function isMapped(target, destination, mapping) {
  let tablePlural;
  let bindings;

  // Should check all passed arguments are presented
  if (!target || !destination) {
    console.error('Incorrect arguments list: ', arguments); // eslint-disable-line
    return false;
  }
  if (_.isUndefined(mapping)) {
    tablePlural = businessModels[destination.type].table_plural;
    mapping = (target.has_binding(tablePlural) ? '' : 'related_') +
      tablePlural;
  }
  bindings = target.get_binding(mapping);
  if (bindings && bindings.list && bindings.list.length) {
    return _.find(bindings.list, function (item) {
      return item.instance.id === destination.id;
    });
  }
  if (target.objects && target.objects.length) {
    return _.find(target.objects, function (item) {
      return item.id === destination.id && item.type === destination.type;
    });
  }
}

/**
 * Get list of mappable objects for certain type
 *
 * @param {String} type - Type of object we want to
 *                      get list of mappable objects for
 * @param {Object} options - Options
 *   @param {Array} options.whitelist - List of objects that will always appear
 *   @param {Array} options.forbidden - List of objects that will always be removed
 *
 * @return {Array} - List of mappable objects
 */
function getMappableTypes(type, options) {
  let result;
  let canonical = Mappings.get_canonical_mappings_for(type);
  let list = GGRC.tree_view.base_widgets_by_type[type];
  let forbidden;
  let forbiddenList = {
    Program: ['Audit'],
    Audit: ['Assessment', 'Program'],
    Person: ['Issue'],
  };
  options = options || {};
  if (!type) {
    return [];
  }
  forbidden = _.union(forbiddenList[type] || [], options.forbidden || []);
  const compacted = _.compact([_.keys(canonical), list]);
  result = _.intersection(...compacted);

  result = _.difference(result, forbidden);

  if (options.whitelist) {
    result = _.union(result, options.whitelist);
  }
  return result;
}

/**
 * Determine if two types of models can be mapped
 *
 * @param {String} target - the target type of model
 * @param {String} source - the source type of model
 * @param {Object} options - accepts:
 *        {Array} whitelist - list of added objects
 *        {Array} forbidden - list blacklisted objects
 *
 * @return {Boolean} - true if mapping is allowed, false otherwise
 */
function isMappableType(target, source, options) {
  let result;
  if (!target || !source) {
    return false;
  }
  result = getMappableTypes(target, options);
  return _.contains(result, source);
}

/**
 * Determine if `source` is allowed to be mapped to `target`.
 *
 * By symmetry, this method can be also used to check whether `source` can
 * be unmapped from `target`.
 *
 * @param {Object} source - the source object the mapping
 * @param {Object} target - the target object of the mapping
 * @param {Object} options - the options objects, similar to the one that is
 *   passed as an argument to Mustache helpers
 *
 * @return {Boolean} - true if mapping is allowed, false otherwise
 */
function allowedToMap(source, target, options) {
  let canMap = false;
  let types;
  let targetType;
  let sourceType;
  let targetContext;
  let sourceContext;
  let createContexts;
  let canonical;
  let hasWidget;
  let canonicalMapping;

  let FORBIDDEN = Object.freeze({
    oneWay: Object.freeze({
      // mapping audit to issue is not allowed,
      // but unmap can be possible
      'issue audit': !(options && options.isIssueUnmap),
      'issue person': true,
    }),
    // NOTE: the names in every type pair must be sorted alphabetically!
    twoWay: Object.freeze({
      'audit program': true,
      'audit request': true,
      'assessmenttemplate cacheable': true,
      'cacheable person': true,
      'person risk': true,
      'person threat': true,
    }),
  });

  if (target instanceof can.Model) {
    targetType = target.constructor.shortName;
  } else {
    targetType = target.type || target;
  }
  sourceType = source.constructor.shortName || source;
  types = [sourceType.toLowerCase(), targetType.toLowerCase()];

  // One-way check
  // special case check:
  // - mapping an Audit to a Issue is not allowed
  // (but vice versa is allowed)
  if (FORBIDDEN.oneWay[types.join(' ')]) {
    return false;
  }

  // Two-way check:
  // special case check:
  // - mapping an Audit to a Program is not allowed
  // - mapping an Audit to a Request is not allowed
  // (and vice versa)
  if (FORBIDDEN.twoWay[types.sort().join(' ')]) {
    return false;
  }

  // special check for snapshot:
  if (options &&
    options.context &&
    options.context.parent_instance &&
    options.context.parent_instance.snapshot) {
    // Avoid add mapping for snapshot
    return false;
  }

  canonical = Mappings.get_canonical_mapping_name(
    sourceType, targetType);
  canonicalMapping = Mappings.get_canonical_mapping(
    sourceType, targetType);

  if (canonical && canonical.indexOf('_') === 0) {
    canonical = null;
  }

  hasWidget = _.contains(
    GGRC.tree_view.base_widgets_by_type[sourceType] || [],
    targetType);

  if (_.exists(options, 'hash.join') && (!canonical || !hasWidget) ||
    (canonical && !canonicalMapping.model_name)) {
    return false;
  }
  targetContext = _.exists(target, 'context.id');
  sourceContext = _.exists(source, 'context.id');
  createContexts = _.exists(
    GGRC, 'permissions.create.Relationship.contexts');

  canMap = Permission.is_allowed_for('update', source) ||
    sourceType === 'Person' ||
    _.contains(createContexts, sourceContext) ||
    // Also allow mapping to source if the source is about to be created.
    _.isUndefined(source.created_at);

  if (target instanceof can.Map && targetType) {
    canMap = canMap &&
      (Permission.is_allowed_for('update', target) ||
      targetType === 'Person' ||
      _.contains(createContexts, targetContext));
  }
  return canMap;
}

/**
 * Return Model Constructor Instance
 * @param {String} type - Model type
 * @return {CMS.Model.Cacheble|null} - Return Model Constructor
 */
function getModelByType(type) {
  if (!type || typeof type !== 'string') {
    console.debug('Type is not provided or has incorrect format',
      'Value of Type is: ', type);
    return null;
  }
  return businessModels[type];
}

/**
 * Remove all HTML tags from the string
 * @param {String} originalText - original string for parsing
 * @return {string} - plain text without tags
 */
function getPlainText(originalText) {
  originalText = originalText || '';
  return originalText.replace(/<[^>]*>?/g, '').trim();
}

/**
 * A function that returns the highest role in an array of strings of roles
 * or a comma-separated string of roles.
 *
 * @param {Cacheable} obj - Assignable object with defined
 *   assignable_list class property holding assignable roles ordered in
 *   increasing importance.
 * Return highest assignee role from a list of roles
 * @param {Array|String} roles - An Array of strings or a String with comma
 *   separated values of roles.
 * @return {string} - Highest role from an array of strings or 'none' if
 *   none found.
 */
function getHighestAssigneeRole(obj, roles) {
  let roleOrder = _.map(
    _.map(obj.class.assignable_list, 'type'),
    _.capitalize);

  if (_.isString(roles)) {
    roles = roles.split(',');
  }

  roles = _.map(roles, _.capitalize);

  roles.unshift('none');
  return _.max(roles, Array.prototype.indexOf.bind(roleOrder));
}

/**
 * Build string of assignees types separated by commas.
 * @param {Object} instance - Object instance
 * @return {String} assignees types separated by commas
 */
function getAssigneeType(instance) {
  let currentUser = GGRC.current_user;
  let roles = getRolesForType(instance.type);
  let userType = null;

  if (!instance || !currentUser) {
    return;
  }

  _.each(roles, function (role) {
    let aclPerson = instance
      .access_control_list
      .filter((item) => item.ac_role_id === role.id &&
        item.person.id == currentUser.id); // eslint-disable-line

    if (!aclPerson.length) {
      return;
    }

    userType = userType ? userType + ',' + role.name : role.name;
  });

  return userType;
}

const _hooks = {};

function registerHook(path, hook) {
  let hs;
  let parentPath = path.split('.');
  let last = parentPath.pop();
  parentPath = can.getObject(parentPath.join('.'), _hooks, true);
  if (!(hs = parentPath[last])) {
    hs = new can.Observe.List();
    parentPath[last] = hs;
  }
  hs.push(hook);
}

function getHooks() {
  return _hooks;
}

export {
  applyTypeFilter,
  isInnerClick,
  inViewport,
  formatDate,
  getPersonInfo,
  getPickerElement,
  loadScript,
  hasPending,
  isMapped,
  getMappableTypes,
  isMappableType,
  allowedToMap,
  getModelByType,
  getPlainText,
  getHighestAssigneeRole,
  getAssigneeType,
  registerHook,
  getHooks,
};
