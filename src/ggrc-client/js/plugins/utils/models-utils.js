/*
  Copyright (C) 2018 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import RefreshQueue from '../../models/refresh_queue';
import * as businessModels from '../../models/business-models/';

const relatedAssessmentsTypes = Object.freeze(['Control', 'Objective']);

const getModelInstance = (id, type, requiredAttr) => {
  const promise = new Promise((resolve, reject) => {
    let modelInstance;

    if (!id || !type || !requiredAttr) {
      reject();
    }

    modelInstance = businessModels[type].findInCacheById(id) || {};

    if (modelInstance && modelInstance.hasOwnProperty(requiredAttr)) {
      resolve(modelInstance);
    } else {
      modelInstance = new businessModels[type]({id: id});
      new RefreshQueue()
        .enqueue(modelInstance)
        .trigger()
        .done((data) => {
          data = Array.isArray(data) ? data[0] : data;
          resolve(data);
        })
        .fail(function () {
          GGRC.Errors
            .notifier('error', `Failed to fetch data for ${type}: ${id}.`);
          reject();
        });
    }
  });

  return promise;
};

const inferObjectType = (data) => {
  let decisionTree = _getObjectTypeDecisionTree();

  function resolve(subtree, data) {
    if (typeof subtree === 'undefined') {
      return null;
    }
    return can.isPlainObject(subtree) ?
      subtree._discriminator(data) :
      subtree;
  }

  if (!data) {
    return null;
  } else {
    return can.reduce(Object.keys(data), function (a, b) {
      return a || resolve(decisionTree[b], data[b]);
    }, null);
  }
};

const makeModelInstance = (data) => {
  if (!data) {
    return null;
  } else if (!!GGRC.page_model && GGRC.page_object === data) {
    return GGRC.page_model;
  } else {
    return GGRC.page_model = inferObjectType(data).model($.extend({}, data));
  }
};

/**
 * Check the model has Related Assessments
 * @param {String} type - model type
 * @return {Boolean}
 */
const hasRelatedAssessments = (type) => {
  return _.contains(relatedAssessmentsTypes, type);
};

const handlePendingJoins = (obj) => {
  const hasPendingJoins = _.get(obj, '_pending_joins.length') > 0;

  if (!hasPendingJoins) {
    return can.Deferred().resolve(obj);
  }

  return _resolveDeferredBindings(obj);
};

const resolveDeferredBindings = (obj) => {
  const hasPendingJoins = _.get(obj, '_pending_joins.length') > 0;

  if (!hasPendingJoins) {
    return can.Deferred().resolve(obj);
  }

  return _resolveDeferredBindings(obj)
    .then(() => obj.refresh());
};

function _resolveDeferredBindings(obj) {
  const pendingJoins = obj._pending_joins.slice(0); // refresh of bindings later will muck up the pending joins on the object
  const uniqueThrough = _(pendingJoins).chain()
    .map((pj) => pj.through)
    .unique()
    .value();

  const refreshDfds = [];
  can.each(uniqueThrough, (binding) => {
    refreshDfds.push(obj.get_binding(binding).refresh_stubs());
  });

  return $.when(...refreshDfds)
    .then(() => {
      const dfds = [];
      can.each(obj._pending_joins, (pj) => {
        switch (pj.how) {
          case 'add':
            dfds.push(..._addHandler(obj, pj));
            break;
          case 'update':
            dfds.push(..._updateHandler(obj, pj));
            break;
          case 'remove':
            dfds.push(..._removeHandler(obj, pj));
            break;
          default: {
            // nothing
          }
        }
      });

      const dfdsApply = $.when(...dfds);
      obj.attr('_pending_joins', []);
      obj.attr('_pending_joins_dfd', dfdsApply);

      return dfdsApply.then(() => {
        obj.dispatch('resolvePendingBindings');
        return obj;
      });
    });
}

function _addHandler(obj, pj) {
  const binding = obj.get_binding(pj.through);
  const dfds = [];
  // Don't re-add -- if the object is already mapped (could be direct or through a proxy)
  // move on to the next one
  if (_.includes(_.map(binding.list, 'instance'), pj.what) ||
      (binding.loader.option_attr &&
      _.includes(_.map(binding.list, function (joinObj) {
        return joinObj.instance[binding.loader.option_attr];
      }), pj.what))) {
    return dfds;
  }
  const model = (businessModels[binding.loader.model_name] ||
    GGRC.Models[binding.loader.model_name]);
  const inst = pj.what instanceof model
    ? pj.what
    : new model({
      context: obj.context,
    });
  const pjDfd = pj.what !== inst && pj.what.isNew()
    ? pj.what.save() : null;
  const dfd = $.when(pjDfd)
    .then(function () {
      if (binding.loader.object_attr) {
        inst.attr(binding.loader.object_attr, obj.stub());
      }
      if (binding.loader.option_attr) {
        inst.attr(binding.loader.option_attr, pj.what.stub());
      }
      if (pj.extra) {
        inst.attr(pj.extra);
      }
      return inst.save();
    });
  dfds.push(dfd);
  return dfds;
}

function _updateHandler(obj, pj) {
  const dfds = [];
  let binding = obj.get_binding(pj.through);
  binding.list.forEach(function (boundObj) {
    let blOptionAttr = binding.loader.option_attr;
    if (boundObj.instance === pj.what ||
        boundObj.instance[blOptionAttr] === pj.what) {
      boundObj.get_mappings().forEach(function (mapping) {
        dfds.push(mapping.refresh().then(function () {
          if (pj.extra) {
            mapping.attr(pj.extra);
          }
          return mapping.save();
        }));
      });
    }
  });
  return dfds;
}

function _removeHandler(obj, pj) {
  const binding = obj.get_binding(pj.through);
  const dfds = [];
  can.map(binding.list, function (boundObj) {
    let blOptionAttr = binding.loader.option_attr;
    if (boundObj.instance === pj.what ||
        boundObj.instance[blOptionAttr] === pj.what) {
      can.each(boundObj.get_mappings(), function (mapping) {
        dfds.push(mapping.refresh().then(function () {
          mapping.destroy();
        }));
      });
    }
  });
  return dfds;
}

function _getObjectTypeDecisionTree() { // eslint-disable-line
  let tree = {};
  let extensions = GGRC.extensions || [];

  can.each(extensions, function (extension) {
    if (extension.object_type_decision_tree) {
      if (can.isFunction(extension.object_type_decision_tree)) {
        $.extend(tree, extension.object_type_decision_tree());
      } else {
        $.extend(tree, extension.object_type_decision_tree);
      }
    }
  });

  return tree;
}

export {
  getModelInstance,
  hasRelatedAssessments,
  relatedAssessmentsTypes,
  resolveDeferredBindings,
  handlePendingJoins,
  makeModelInstance,
  inferObjectType,
};
