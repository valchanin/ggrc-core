/* !
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import {
  isSnapshot,
  isSnapshotModel,
  isSnapshotRelated,
  isSnapshotScope,
  toObject,
  transformQuery,
} from './snapshot-utils';
import {
  related,
  initMappedInstances,
  isObjectContextPage,
  getPageType,
  isMyWork,
} from './current-page-utils';
import {
  buildParam,
  makeRequest,
  batchRequests,
  buildCountParams,
} from './query-api-utils';
import {
  parentHasObjectVersions,
  getWidgetConfigs,
  getWidgetConfig,
} from './object-versions-utils';

/**
* TreeView-specific utils.
*/

var baseWidgets = GGRC.tree_view.attr('base_widgets_by_type');
var defaultOrderTypes = GGRC.tree_view.attr('defaultOrderTypes');
var allTypes = Object.keys(baseWidgets.attr());
var orderedModelsForSubTier = {};


var SUB_TREE_ELEMENTS_LIMIT = 20;
var SUB_TREE_FIELDS = Object.freeze([
  'child_id',
  'child_type',
  'context',
  'email',
  'id',
  'is_latest_revision',
  'name',
  'revision',
  'revisions',
  'selfLink',
  'slug',
  'status',
  'title',
  'type',
  'viewLink',
  'workflow_state',
  'archived',
  // label for Audit
  'program',
  // labels for assessment templates
  'DEFAULT_PEOPLE_LABELS',
]);

var FULL_SUB_LEVEL_LIST = Object.freeze([
  'Cycle',
  'CycleTaskGroup',
  'CycleTaskGroupObjectTask',
]);

var NO_FIELDS_LIMIT_LIST = Object.freeze([
  'Assessment',
]);

const DEFAULT_SORT_KEY = 'updated_at';
const DEFAULT_SORT_DIRECTION = 'desc';
const NO_DEFAULT_SORTING_LIST = Object.freeze([
  'Cycle',
  'TaskGroup',
  'TaskGroupTask',
  'CycleTaskGroupObjectTask',
]);

var treeViewExcess = {
  AssessmentTemplate: ['os_state'],
};

allTypes.forEach(function (type) {
  var related = baseWidgets[type].slice(0);

  orderedModelsForSubTier[type] = _.chain(related)
    .map(function (type) {
      return {
        name: type,
        order: defaultOrderTypes[type],
      };
    })
    .sortByAll(['order', 'name'])
    .map('name')
    .value();
});

// Define specific rules for Workflow models
orderedModelsForSubTier.Cycle = ['CycleTaskGroup'];
orderedModelsForSubTier.CycleTaskGroup = ['CycleTaskGroupObjectTask'];
orderedModelsForSubTier.CycleTaskGroupObjectTask = [];

function getSubTreeFields(parent, child) {
  var noFieldsLimitOnChild = hasNoFieldsLimit(child);
  var noFieldsLimitOnParent = _isFullSubTree(parent);
  return noFieldsLimitOnChild || noFieldsLimitOnParent ?
    [] :
    SUB_TREE_FIELDS;
}

function hasNoFieldsLimit(type) {
  return NO_FIELDS_LIMIT_LIST.indexOf(type) > -1;
}

/**
 * Skip attrs which unused in current model name tree
 * @param {String} modelName - Name of current page.
 * @param {String} attrList - Attr list.
 * @return {Object} Changed attr list.
 */
function skipUnusable(modelName, attrList) {
  if (treeViewExcess[modelName]) {
    attrList = attrList.filter(function (item) {
      return treeViewExcess[modelName].indexOf(item.attr_name) < 0;
    });
  }
  return attrList;
}

/**
 * Get available and selected columns for Model type
 * @param {String} modelType - Model type.
 * @param {Object} displayPrefs - Display preferences.
 * @param {Boolean} [includeRichText] - Need to include Rich Text in the configuration
 * @param {String} modelName - Model name.
 * @return {Object} Table columns configuration.
 */
function getColumnsForModel(modelType, displayPrefs, includeRichText,
  modelName) {
  var Cacheable = can.Model.Cacheable;
  var Model = CMS.Models[modelType];
  var modelDefinition = Model().class.root_object;
  var mandatoryAttrNames =
    Model.tree_view_options.mandatory_attr_names ||
    Cacheable.tree_view_options.mandatory_attr_names;
  var savedAttrList = displayPrefs ?
    displayPrefs.getTreeViewHeaders(modelName || Model.model_singular) :
    [];
  var displayAttrNames =
    savedAttrList.length ? savedAttrList :
      (Model.tree_view_options.display_attr_names ||
      Cacheable.tree_view_options.display_attr_names);
  var disableConfiguration =
    !!Model.tree_view_options.disable_columns_configuration;
  var mandatoryColumns;
  var displayColumns;
  var attrs;
  var customAttrs;
  var allAttrs;
  var modelRoles;
  var roleAttrs;

  attrs = can.makeArray(
    Model.tree_view_options.mapper_attr_list ||
    Model.tree_view_options.attr_list ||
    Cacheable.attr_list
  ).filter(function (attr) {
    return !attr.deny;
  }).map(function (attr) {
    attr = _.assign({}, attr);
    if (!attr.attr_sort_field) {
      attr.attr_sort_field = attr.attr_name;
    }
    return attr;
  }).sort(function (a, b) {
    if (a.order && !b.order) {
      return -1;
    } else if (!a.order && b.order) {
      return 1;
    }
    return a.order - b.order;
  });

  // skip attrs which unused in current model name tree
  attrs = skipUnusable(modelName, attrs);

  // add custom attributes information
  customAttrs = disableConfiguration ?
    [] :
    GGRC.custom_attr_defs
      .filter(function (def) {
        var include = def.definition_type === modelDefinition;

        if (!includeRichText) {
          include = include && def.attribute_type !== 'Rich Text';
        }

        return include;
      }).map(function (def) {
        return {
          attr_title: def.title,
          attr_name: def.title,
          attr_sort_field: def.title,
          display_status: false,
          attr_type: 'custom',
        };
      });
  allAttrs = attrs.concat(customAttrs);

  // add custom roles information
  modelRoles = _.filter(GGRC.access_control_roles, {
    object_type: modelType,
  });
  roleAttrs = modelRoles.map(function (role) {
    return {
      attr_title: role.name,
      attr_name: role.name,
      attr_sort_field: role.name,
      display_status: false,
      attr_type: 'role',
    };
  });
  allAttrs = allAttrs.concat(roleAttrs);

  if (disableConfiguration) {
    return {
      available: allAttrs,
      selected: allAttrs,
      disableConfiguration: true,
    };
  }

  displayAttrNames = displayAttrNames.concat(mandatoryAttrNames);

  allAttrs.forEach(function (attr) {
    attr.display_status = displayAttrNames.indexOf(attr.attr_name) !== -1;
    attr.mandatory = mandatoryAttrNames.indexOf(attr.attr_name) !== -1;
  });

  mandatoryColumns = allAttrs.filter(function (attr) {
    return attr.mandatory;
  });

  displayColumns = allAttrs.filter(function (attr) {
    return attr.display_status && !attr.mandatory;
  });

  return {
    available: allAttrs,
    selected: mandatoryColumns.concat(displayColumns),
    mandatory: mandatoryAttrNames,
    disableConfiguration: false,
  };
}

/**
 * Set selected columns for Model type
 * @param {String} modelType - Model type.
 * @param {Array} columnNames - Array of column names.
 * @param {Object} displayPrefs - Display preferences.
 * @param {String} modelName - Model name.
 * @return {Object} Table columns configuration.
 */
function setColumnsForModel(modelType, columnNames, displayPrefs,
  modelName) {
  var availableColumns =
    getColumnsForModel(modelType, displayPrefs, true).available;
  var selectedColumns = [];
  var selectedNames = [];

  availableColumns.forEach(function (attr) {
    if (columnNames.indexOf(attr.attr_name) !== -1) {
      attr.display_status = true;
      selectedColumns.push(attr);
      if (!attr.mandatory) {
        selectedNames.push(attr.attr_name);
      }
    } else {
      attr.display_status = false;
    }
  });

  if (displayPrefs) {
    displayPrefs.setTreeViewHeaders(
      modelName || CMS.Models[modelType].model_singular,
      selectedNames
    );
    displayPrefs.save();
  }

  return {
    available: availableColumns,
    selected: selectedColumns,
  };
}

/**
 * Returns map where key is name of field
 * and value True if column selected and False or not.
 * @param {Array} available - Full list of available columns.
 * @param {Array} selected - List of selected columns.
 * @return {Array} Map with selected columns.
 */
function createSelectedColumnsMap(available, selected) {
  var selectedColumns = can.makeArray(selected);
  var availableColumns = can.makeArray(available);
  var columns = new can.Map();

  availableColumns
    .forEach(function (attr) {
      var value = {};
      value[attr.attr_name] = selectedColumns
        .some(function (selectedAttr) {
          return selectedAttr.attr_name === attr.attr_name;
        });
      columns.attr(value);
    });

  return columns;
}

/**
 * Get sorting configuration for Model type
 * @param {String} modelType - Model type.
 * @return {Object} sorting configuration.
 */
function getSortingForModel(modelType) {
  let key = DEFAULT_SORT_KEY;
  let direction = DEFAULT_SORT_DIRECTION;

  if (NO_DEFAULT_SORTING_LIST.indexOf(modelType) != -1) {
    key = null;
    direction = null;
  }

  return {
    key,
    direction,
  };
}

/**
 * Get available and selected models for the Model sub tier
 * @param {String} modelName - Model name.
 * @return {Object} Sub tier filter configuration.
 */
function getModelsForSubTier(modelName) {
  var Model = CMS.Models[modelName];
  var availableModels;
  var selectedModels;

  // getMappableTypes can't be run at once,
  // cause GGRC.Mappings is not loaded yet
  if (modelName === 'CycleTaskGroupObjectTask' &&
  !orderedModelsForSubTier[modelName].length) {
    orderedModelsForSubTier[modelName] =
    GGRC.Utils.getMappableTypes('CycleTaskGroupObjectTask');
  }

  availableModels = orderedModelsForSubTier[modelName] || [];

  if (Model.sub_tree_view_options.default_filter) {
    selectedModels = Model.sub_tree_view_options.default_filter;
  } else {
    selectedModels = availableModels;
  }

  return {
    available: availableModels,
    selected: selectedModels,
  };
}

/**
 *
 * @param {String} modelName - Name of requested objects.
 * @param {Object} parent - Information about parent object.
 * @param {String} parent.type - Type of parent object.
 * @param {Number} parent.id - ID of parent object.
 * @param {Object} filterInfo - Information about pagination, sorting and filtering
 * @param {Number} filterInfo.current -
 * @param {Number} filterInfo.pageSize -
 * @param {Number} filterInfo.sortBy -
 * @param {Number} filterInfo.sortDirection -
 * @param {Number} filterInfo.filter -
 * @param {Object} filter -
 * @param {Object} request - Collection of QueryAPI sub-requests
 * @param {Boolean} transforToSnapshot - Transform query to Snapshot
 * @return {Promise} Deferred Object
 */
function loadFirstTierItems(modelName,
                            parent,
                            filterInfo,
                            filter,
                            request) {
  var modelConfig = getWidgetConfig(modelName);

  var params = buildParam(
    modelConfig.responseType,
    filterInfo,
    makeRelevantExpression(modelConfig.name, parent.type, parent.id),
    null,
    filter
  );
  var requestedType;
  var requestData = request.slice() || can.List();

  if ((isSnapshotScope(parent) && isSnapshotModel(modelConfig.name))) {
    params = transformQuery(params);
  }

  requestedType = params.object_name;
  requestData.push(params);
  return makeRequest({data: requestData.attr()})
    .then(function (response) {
      response = _.last(response)[requestedType];

      response.values = response.values.map(function (source) {
        return _createInstance(source, modelConfig.responseType);
      });

      return response;
    });
}

/**
 *
 * @param {Array} models - Array of models for load in sub tree
 * @param {String} type - Type of parent object.
 * @param {Number} id - ID of parent object.
 * @param {String} filter - Filter.
 * @return {Promise} - Items for sub tier.
 */
function loadItemsForSubTier(models, type, id, filter) {
  var relevant = {
    type: type,
    id: id,
    operation: 'relevant',
  };
  var showMore = false;
  var loadedModelObjects = [];

  return _buildSubTreeCountMap(models, relevant, filter)
    .then(function (result) {
      var countMap = result.countsMap;
      var dfds;
      var mappedDfd;
      var resultDfd;

      loadedModelObjects = getWidgetConfigs(Object.keys(countMap));
      showMore = result.showMore;

      dfds = loadedModelObjects.map(function (modelObject) {
        var subTreeFields = getSubTreeFields(type, modelObject.name);
        var pageInfo = {
          filter: filter,
        };
        var params;

        if (countMap[modelObject.name]) {
          pageInfo.current = 1;
          pageInfo.pageSize = countMap[modelObject.name];
        }

        params = buildParam(
          modelObject.responseType,
          pageInfo,
          relevant,
          subTreeFields,
          modelObject.additionalFilter ?
            GGRC.query_parser.parse(modelObject.additionalFilter) :
            null
        );

        if (isSnapshotRelated(relevant.type, params.object_name)) {
          params = transformQuery(params);
        }

        return batchRequests(params);
      });

      resultDfd = can.when.apply(can, dfds).promise();

      if (!related.initialized) {
        mappedDfd = initMappedInstances();

        return can.when(mappedDfd, dfds).then(function () {
          return resultDfd;
        });
      }

      return resultDfd;
    })
    .then(function () {
      var directlyRelated = [];
      var notRelated = [];
      var response = can.makeArray(arguments);

      loadedModelObjects.forEach(function (modelObject, index) {
        var values;

        if (isSnapshotModel(modelObject.name) &&
          response[index].Snapshot) {
          values = response[index].Snapshot.values;
        } else {
          values = response[index][modelObject.name].values;
        }

        values.forEach(function (source) {
          var instance = _createInstance(source, modelObject.name);

          if (isDirectlyRelated(instance)) {
            directlyRelated.push(instance);
          } else {
            notRelated.push(instance);
          }
        });
      });

      return {
        directlyItems: directlyRelated,
        notDirectlyItems: notRelated,
        showMore: showMore,
      };
    });
}

/**
 *
 * @param {String} requestedType - Type of requested object.
 * @param {String} relevantToType - Type of parent object.
 * @param {Number} relevantToId - ID of parent object.
 * @param {String} [operation] - Type of operation
 * @return {object} Returns expression for load items for 1st level of tree view.
 */
function makeRelevantExpression(requestedType,
                                relevantToType,
                                relevantToId,
                                operation) {
  var isObjectBrowser = /^\/objectBrowser\/?$/
    .test(window.location.pathname);
  var expression;

  if (!isObjectBrowser) {
    expression = {
      type: relevantToType,
      id: relevantToId,
    };

    expression.operation = operation ? operation :
      _getTreeViewOperation(requestedType);
  }
  return expression;
}

/**
 * Check if object directly mapped to the current context.
 * @param {Object} instance - Instance of model.
 * @private
 * @return {Boolean} Is associated with the current context.
 */
function isDirectlyRelated(instance) {
  var needToSplit = isObjectContextPage() &&
    getPageType() !== 'Workflow';
  var relates = related.attr(instance.type);
  var result = true;
  var instanceId = isSnapshot(instance) ?
    instance.snapshot.id :
    instance.id;

  if (needToSplit) {
    result = !!(relates && relates[instanceId]);
  }

  return result;
}

/**
 *
 * @param {Array} models - Type of model.
 * @param {Object} relevant - Relevant description
 * @param {String} filter - Filter string.
 * @return {Array} - List of queries
 * @private
 */
function _getQuerryObjectVersion(models, relevant, filter) {
  var countQuery = [];
  models.forEach(function (model) {
    var widgetConfig = getWidgetConfig(model);
    var name = widgetConfig.name;
    var query = buildCountParams([name], relevant, filter);

    if (widgetConfig.isObjectVersion) {
      query = transformQuery(query[0]);
      countQuery.push(query);
    } else {
      countQuery.push(query[0]);
    }
  });

  return countQuery;
}

/**
 *
 * @param {Array} models - Type of model.
 * @param {Object} relevant - Relevant description
 * @param {String} filter - Filter string.
 * @return {Promise} - Counts for limitation load items for sub tier
 * @private
 */
function _buildSubTreeCountMap(models, relevant, filter) {
  var countQuery;
  var result;
  var countMap = {};

  if (_isFullSubTree(relevant.type)) {
    models.forEach(function (model) {
      countMap[model] = false;
    });
    result = can.Deferred().resolve({
      countsMap: countMap,
      showMore: false,
    });
  } else {
    if (parentHasObjectVersions(relevant.type)) {
      countQuery = _getQuerryObjectVersion(models, relevant, filter);
    } else {
      countQuery = buildCountParams(models, relevant, filter)
        .map(function (param) {
          if (isSnapshotRelated(
              relevant.type,
              param.object_name)) {
            param = transformQuery(param);
          }
          return param;
        });
    }

    result = makeRequest({data: countQuery})
      .then(function (response) {
        var total = 0;
        var showMore = models.some(function (model, index) {
          var count = response[index][model] ?
            response[index][model].total :
            response[index].Snapshot.total;

          if (!count) {
            return false;
          }

          if (total + count < SUB_TREE_ELEMENTS_LIMIT) {
            countMap[model] = count;
          } else {
            countMap[model] = SUB_TREE_ELEMENTS_LIMIT - total;
          }

          total += count;

          return total >= SUB_TREE_ELEMENTS_LIMIT;
        });

        return {
          countsMap: countMap,
          showMore: showMore,
        };
      });
  }

  return result;
}

function _isFullSubTree(type) {
  return FULL_SUB_LEVEL_LIST.indexOf(type) >= 0;
}

/**
 * @param {Object} source - Instance object.
 * @param {String} modelName - Name of model.
 * @return {CMS.Models} - Instance of model.
 * @private
 */
function _createInstance(source, modelName) {
  var instance;

  if (source.type === 'Snapshot') {
    instance = toObject(source);
  } else {
    instance = CMS.Models[modelName].model(source);
  }
  return instance;
}

function _getTreeViewOperation(objectName) {
  var isDashboard = isMyWork();
  var operation;
  if (isDashboard) {
    operation = 'owned';
  } else if (!isDashboard && objectName === 'Person') {
    operation = 'related_people';
  }
  return operation;
}

export {
  getColumnsForModel,
  setColumnsForModel,
  getSortingForModel,
  getModelsForSubTier,
  loadFirstTierItems,
  loadItemsForSubTier,
  makeRelevantExpression,
  createSelectedColumnsMap,
  isDirectlyRelated,
};
