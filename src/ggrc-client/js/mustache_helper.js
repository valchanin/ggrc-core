/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Spinner from 'spin.js';
import {
  isInScopeModel,
  isSnapshotParent,
} from './plugins/utils/snapshot-utils';
import {
  isMyAssessments,
  isAdmin,
} from './plugins/utils/current-page-utils';
import {
  getRole,
} from './plugins/utils/acl-utils';
import RefreshQueue from './models/refresh_queue';
import Permission from './permission';
import _ from 'lodash';
import {
  buildCountParams,
  batchRequests,
} from './plugins/utils/query-api-utils';

// Chrome likes to cache AJAX requests for Mustaches.
let mustacheUrls = {};
let Mustache = can.Mustache;
$.ajaxPrefilter(function (options, originalOptions, jqXHR) {
  if (/\.mustache$/.test(options.url)) {
    if (mustacheUrls[options.url]) {
      options.url = mustacheUrls[options.url];
    } else {
      mustacheUrls[options.url] = options.url += '?r=' + Math.random();
    }
  }
});

function getTemplatePath(url) {
  let match;
  match = url.match(/\/static\/(mustache|mockups)\/(.*)\.mustache/);
  return match && match[2];
}

// Check if the template is available in "GGRC.Templates", and if so,
//   short-circuit the request.

$.ajaxTransport('text', function (options, _originalOptions, _jqXHR) {
  let templatePath = getTemplatePath(options.url);
  let template = templatePath && GGRC.Templates[templatePath];
  if (template) {
    return {
      send: function (headers, completeCallback) {
        function done() {
          if (template) {
            completeCallback(200, 'success', {text: template});
          }
        }
        if (options.async) {
          // Use requestAnimationFrame where possible because we want
          // these to run as quickly as possible but still release
          // the thread.
          (window.requestAnimationFrame || window.setTimeout)(done, 0);
        } else {
          done();
        }
      },

      abort: function () {
        template = null;
      },
    };
  }
});

/**
 * Builds class name of two segments - prefix and computed value
 * @param  {String|computed} prefix class prefix
 * @param  {String|computed} compute some computed value
 * @param  {Object} [options={}] options
 * @param  {Object} [options.separator='-'] separator between prefix and comuted value
 * @param  {Object} [options.computeSeparator=''] separator which replaces whitespaces in computed value
 * @return {String} computed class string
 */
Mustache.registerHelper('addclass', function (prefix, compute, options = {}) {
  prefix = resolveComputed(prefix);
  let computeVal = resolveComputed(compute);
  let opts = options.hash || {};
  let separator = _.isString(opts.separator) ? opts.separator : '-';
  let computeSeparator = _.isString(opts.computeSeparator)
    ? opts.computeSeparator : '';
  let classSegment = _.trim(computeVal)
    .replace(/[\s\t]+/g, computeSeparator)
    .toLowerCase();

  return [prefix, classSegment].join(separator);
});

Mustache.registerHelper('if_equals', function (val1, val2, options) {
  let _val1;
  let _val2;
  function exec() {
    if (_val1 && val2 && options.hash && options.hash.insensitive) {
      _val1 = _val1.toLowerCase();
      _val2 = _val2.toLowerCase();
    }
    if (_val1 === _val2) return options.fn(options.contexts);
    else return options.inverse(options.contexts);
  }
  if (typeof val1 === 'function') {
    if (val1.isComputed) {
      val1.bind('change', function (ev, newVal, oldVal) {
        _val1 = newVal;
        return exec();
      });
    }
    _val1 = val1.call(this);
  } else {
    _val1 = val1;
  }
  if (typeof val2 === 'function') {
    if (val2.isComputed) {
      val2.bind('change', function (ev, newVal, oldVal) {
        _val2 = newVal;
        exec();
      });
    }
    _val2 = val2.call(this);
  } else {
    _val2 = val2;
  }

  return exec();
});

Mustache.registerHelper('if_match', function (val1, val2, options) {
  let _val1 = resolveComputed(val1);
  let _val2 = resolveComputed(val2);
  function exec() {
    let re = new RegExp(_val2);
    if (re.test(_val1)) return options.fn(options.contexts);
    else return options.inverse(options.contexts);
  }
  return exec();
});

Mustache.registerHelper('in_array', function (needle, haystack, options) {
  needle = resolveComputed(needle);
  haystack = resolveComputed(haystack);

  return options[~can.inArray(needle, haystack) ?
    'fn' : 'inverse'](options.contexts);
});

Mustache.registerHelper('if_null', function (val1, options) {
  let that = this;
  let _val1;
  function exec() {
    if (_val1 === null || _val1 === undefined) return options.fn(that);
    else return options.inverse(that);
  }
  if (typeof val1 === 'function') {
    if (val1.isComputed) {
      val1.bind('change', function (ev, newVal, oldVal) {
        _val1 = newVal;
        return exec();
      });
    }
    _val1 = val1.call(this);
  } else {
    _val1 = val1;
  }
  return exec();
});

/**
   * Check if the given argument is a string and render the corresponding
   * block in the template.
   *
   * Example usage:
   *
   *   {{#if_string someValue}}
   *      {{someValue}} is a string
   *   {{else}}
   *     {{someValue}} is NOT a string
   *   {{/if_string}}
   *
   * @param {*} thing - the argument to check
   * @param {Object} options - a CanJS options argument passed to every helper
   *
   */
Mustache.registerHelper('if_string', function (thing, options) {
  let resolved;

  if (arguments.length !== 2) {
    throw new Error(
      'Invalid number of arguments (' +
        (arguments.length - 1) + // do not count the auto-provided options arg
        '), expected 1.');
  }

  resolved = Mustache.resolve(thing);

  if (_.isString(resolved)) {
    return options.fn(options.context);
  }

  return options.inverse(options.context);
});

/**
   * Return the value of the given object's property.
   *
   * If the first argument is not an object, an error is raised.
   *
   * @param {Object | Function} object - the object itself
   * @param {String | Function} key - the name of the property to retrieve
   * @param {Object} options - the Mustache options object
   *
   * @return {*} - the value of the property object[key]
   */
Mustache.registerHelper('get_item', function (object, key, options) {
  if (arguments.length !== 3) {
    throw new Error(
      'Invalid number of arguments (' +
        (arguments.length - 1) + // do not count the auto-provided options arg
        '), expected 2.');
  }

  object = Mustache.resolve(object);

  if (!_.isObject(object)) {
    throw new Error('First argument must be an object.');
  }

  key = Mustache.resolve(key);
  return object[key];
});

// Resolve and return the first computed value from a list
Mustache.registerHelper('firstexist', function () {
  let args = can.makeArray(arguments).slice(0, arguments.length - 1); // ignore the last argument (some Can object)
  for (let i = 0; i < args.length; i++) {
    let v = resolveComputed(args[i]);
    if (v && v.length) {
      return v.toString();
    }
  }
  return '';
});

// Return the first value from a list that computes to a non-empty string
Mustache.registerHelper('firstnonempty', function () {
  let args = can.makeArray(arguments).slice(0, arguments.length - 1); // ignore the last argument (some Can object)
  for (let i = 0; i < args.length; i++) {
    let v = resolveComputed(args[i]);
    if (v !== null && v !== undefined && !!v.toString()
      .trim().replace(/&nbsp;|\s|<br *\/?>/g, '')) return v.toString();
  }
  return '';
});

Mustache.registerHelper('is_empty', (data, options) => {
  data = resolveComputed(data);
  const result = can.isEmptyObject(
    can.isPlainObject(data) ? data : data.attr()
  );
  return options[result ? 'fn' : 'inverse'](options.contexts);
});

Mustache.registerHelper('pack', function () {
  let options = arguments[arguments.length - 1];
  let objects = can.makeArray(arguments).slice(0, arguments.length - 1);
  let pack = {};
  can.each(objects, function (obj, i) {
    if (typeof obj === 'function') {
      objects[i] = obj = obj();
    }

    if (obj._data) {
      obj = obj._data;
    }
    for (let k in obj) {
      if (obj.hasOwnProperty(k)) {
        pack[k] = obj[k];
      }
    }
  });
  if (options.hash) {
    for (let k in options.hash) {
      if (options.hash.hasOwnProperty(k)) {
        pack[k] = options.hash[k];
      }
    }
  }
  pack = new can.Observe(pack);
  return options.fn(pack);
});

// Render a named template with the specified context, serialized and
// augmented by 'options.hash'
Mustache.registerHelper('render', function (template, context, options) {
  if (!options) {
    options = context;
    context = this;
  }

  if (typeof context === 'function') {
    context = context();
  }

  if (typeof template === 'function') {
    template = template();
  }

  context = $.extend({}, context.serialize ? context.serialize() : context);

  if (options.hash) {
    for (let k in options.hash) {
      if (options.hash.hasOwnProperty(k)) {
        context[k] = options.hash[k];
        if (typeof context[k] === 'function') {
          context[k] = context[k]();
        }
      }
    }
  }

  let ret = can.view.render(template, context instanceof can.view.Scope ?
    context :
    new can.view.Scope(context));
  // can.view.hookup(ret);
  return ret;
});

// Like 'render', but doesn't serialize the 'context' object, and doesn't
// apply options.hash
Mustache.registerHelper('renderLive', function (template, context, options) {
  if (!options) {
    options = context;
    context = this;
  } else {
    options.contexts = options.contexts.add(context);
  }

  if (typeof context === 'function') {
    context = context();
  }

  if (typeof template === 'function') {
    template = template();
  }

  if (options.hash) {
    options.contexts = options.contexts.add(options.hash);
  }

  return can.view.render(template, options.contexts);
});

// Renders one or more "hooks", which are templates registered under a
//  particular key using GGRC.register_hook(), using the current context.
//  Hook keys can be composed with dot separators by passing in multiple
//  positional parameters.
//
// Example: {{{render_hooks 'Audit' 'test_info'}}}  renders all hooks registered
//  with GGRC.register_hook("Audit.test_info", <template path>)
Mustache.registerHelper('render_hooks', function () {
  let args = can.makeArray(arguments);
  let options = args.splice(args.length - 1, 1)[0];
  let hook = can.map(args, Mustache.resolve).join('.');

  return can.map(can.getObject(hook, GGRC.hooks) || [], function (hookTmpl) {
    return can.Mustache.getHelper('renderLive', options.contexts)
      .fn(hookTmpl, options.contexts, options);
  }).join('\n');
});

let deferRender = Mustache.deferRender =
function deferRender(tagPrefix, funcs, deferred) {
  let hook;
  let tagName = tagPrefix.split(' ')[0];

  tagName = tagName || 'span';

  if (typeof funcs === 'function') {
    funcs = {done: funcs};
  }

  function hookup(element, parent, viewId) {
    let $element = $(element);
    let func = function () {
      let def = deferred && deferred.state() === 'rejected' ?
        funcs.fail : funcs.done;
      let args = arguments;
      let compute = can.compute(function () {
        return def.apply(this, args) || '';
      }, this);

      if (element.parentNode) {
        can.view.live.html(element, compute, parent);
      } else {
        $element.after(compute());
        if ($element.next().get(0)) {
          can.view.nodeLists.update($element.get(), $element.nextAll().get());
          $element.remove();
        }
      }
    };
    if (deferred) {
      deferred.done(func);
      if (funcs.fail) {
        deferred.fail(func);
      }
    } else {
      setTimeout(func, 13);
    }

    if (funcs.progress) {
      // You would think that we could just do $element.append(funcs.progress()) here
      //  but for some reason we have to hookup our own fragment.
      $element.append(can.view.hookup($('<div>')
        .html(funcs.progress())).html());
    }
  }

  hook = can.view.hook(hookup);
  return ['<', tagPrefix, ' ', hook, '>', '</', tagName, '>'].join('');
};

Mustache.registerHelper('defer', function (prop, deferred, options) {
  let tagName;
  let allowFail;
  if (!options) {
    options = prop;
    prop = 'result';
  }

  tagName = (options.hash || {}).tag_name || 'span';
  allowFail = (options.hash || {}).allow_fail || false;

  deferred = resolveComputed(deferred);
  if (typeof deferred === 'function') deferred = deferred();
  function finish(items) {
    let ctx = {};
    ctx[prop] = items;
    return options.fn(options.contexts.add(ctx));
  }
  function progress() {
    return options.inverse(options.contexts);
  }

  return deferRender(tagName, {done: finish, fail: allowFail ?
    finish : null, progress: progress}, deferred);
});

Mustache.registerHelper('allow_help_edit', function () {
  let options = arguments[arguments.length - 1];
  let instance = this && this.instance ?
    this.instance : options.context.instance;
  if (instance) {
    let action = instance.isNew() ? 'create' : 'update';
    if (Permission.is_allowed(action, 'Help', null)) {
      return options.fn(this);
    } else {
      return options.inverse(this);
    }
  }
  return options.inverse(this);
});

can.each(['with_page_object_as', 'with_current_user_as'], function (fname) {
  Mustache.registerHelper(fname, function (name, options) {
    if (!options) {
      options = name;
      name = fname.replace(/with_(.*)_as/, '$1');
    }
    let pageObject = (fname === 'with_current_user_as'
      ? (CMS.Models.Person.findInCacheById(GGRC.current_user.id)
                          || CMS.Models.Person.model(GGRC.current_user))
      : GGRC.page_instance()
    );
    if (pageObject) {
      let po = {};
      po[name] = pageObject;
      options.contexts = options.contexts.add(po);
      return options.fn(options.contexts);
    } else {
      return options.inverse(options.contexts);
    }
  });
});

// Iterate over a string by spliting it by a separator
Mustache.registerHelper('iterate_string', function (str, separator, options) {
  let i = 0;
  let args;
  let ctx = {};
  let ret = [];

  str = Mustache.resolve(str);
  separator = Mustache.resolve(separator);
  args = str.split(separator);
  for (; i < args.length; i += 1) {
    ctx.iterator = typeof args[i] === 'string' ? String(args[i]) : args[i];
    ret.push(options.fn(options.contexts.add(ctx)));
  }

  return ret.join('');
});

Mustache.registerHelper('option_select',
  function (object, attrName, role, options) {
    let selectedOption = object.attr(attrName);
    let selectedId = selectedOption ? selectedOption.id : null;
    let optionsDfd = CMS.Models.Option.for_role(role);
    let tabindex = options.hash && options.hash.tabindex;
    let tagPrefix = 'select class="span12"';

    function getSelectHtml(options) {
      return [
        '<select class="span12" model="Option" name="' + attrName + '"',
        tabindex ? ' tabindex=' + tabindex : '',
        '>',
        '<option value=""',
        !selectedId ? ' selected=selected' : '',
        '>---</option>',
        can.map(options, function (option) {
          return [
            '<option value="', option.id, '"',
            selectedId === option.id ? ' selected=selected' : '',
            '>',
            option.title,
            '</option>',
          ].join('');
        }).join('\n'),
        '</select>',
      ].join('');
    }

    return deferRender(tagPrefix, getSelectHtml, optionsDfd);
  });

Mustache.registerHelper('category_select',
  function (object, attrName, categoryType, options) {
    const selectedOptions = object[attrName] || [];
    const selectedIds = can.map(selectedOptions, function (selectedOption) {
      return selectedOption.id;
    });
    const optionsDfd = CMS.Models[categoryType].findAll();
    let tabIndex = options.hash && options.hash.tabindex;
    const tagPrefix = 'select class="span12" multiple="multiple"';

    tabIndex = typeof tabIndex !== 'undefined' ?
      ` tabindex="${tabIndex}"` :
      '';

    function getSelectHtml(options) {
      const sortedOptions = _.sortBy(options, 'name');
      const selectOpenTag = `
        <select class="span12" multiple="multiple"
          model="${categoryType}"
          name="${attrName}"
          ${tabIndex}
        >`;
      const selectCloseTag = '</select>';
      const optionTags = can.map(sortedOptions, function (option) {
        return `
          <option value="${option.id}"
            ${selectedIds.indexOf(option.id) > -1 ? ' selected=selected' : ''}
          >${option.name}</option>`;
      }).join('\n');

      return [
        selectOpenTag,
        optionTags,
        selectCloseTag,
      ].join('');
    }

    return deferRender(tagPrefix, getSelectHtml, optionsDfd);
  });

Mustache.registerHelper('get_permalink_url', function () {
  return window.location.href;
});

Mustache.registerHelper('get_permalink_for_object',
  function (instance, options) {
    instance = resolveComputed(instance);
    if (!instance.viewLink) {
      return '';
    }
    return window.location.origin + instance.viewLink;
  });

/**
   * Generate an anchor element that opens the instance's view page in a
   * new browser tab/window.
   *
   * If the instance does not have such a page, an empty string is returned.
   * The inner content of the tag is used as the text for the link.
   *
   * Example usage:
   *
   *   {{{#view_object_link instance}}}
   *     Open {{firstexist instance.name instance.title}}
   *   {{{/view_object_link}}}
   *
   * NOTE: Since an HTML snippet is generated, the helper should be used with
   * an unescaping block (tripple braces).
   *
   * @param {can.Model} instance - the object to generate the link for
   * @param {Object} options - a CanJS options argument passed to every helper
   * @return {String} - the link HTML snippet
   */
Mustache.registerHelper('view_object_link', function (instance, options) {
  let linkText;

  function onRenderComplete(link) {
    let html = [
      '<a ',
      '  href="' + link + '"',
      '  target="_blank"',
      '  class="view-link">',
      linkText,
      '</a>',
    ].join('');
    return html;
  }

  instance = resolveComputed(instance);
  if (!instance.viewLink && !instance.get_permalink) {
    return '';
  }

  linkText = options.fn(options.contexts);

  return deferRender('a', onRenderComplete, instance.get_permalink());
});

Mustache.registerHelper('schemed_url', function (url) {
  let domain;
  let maxLabel;
  let urlSplit;

  url = Mustache.resolve(url);
  if (!url) {
    return;
  }

  if (!url.match(/^[a-zA-Z]+:/)) {
    url = (window.location.protocol === 'https:' ?
      'https://' : 'http://') + url;
  }

  // Make sure we can find the domain part of the url:
  urlSplit = url.split('/');
  if (urlSplit.length < 3) {
    return 'javascript://';
  }

  domain = urlSplit[2];
  maxLabel = _.max(domain.split('.').map(function (label) {
    return label.length;
  }));
  if (maxLabel > 63 || domain.length > 253) {
    // The url is invalid and might crash user's chrome tab
    return 'javascript://';
  }
  return url;
});

Mustache.registerHelper('show_long', function () {
  return [
    '<a href="javascript://" class="show-long"',
    can.view.hook(function (el, parent, viewId) {
      el = $(el);

      let content = el.prevAll('.short');
      if (content.length) {
        return !function hide() {
          // Trigger the "more" toggle if the height is the same as the scrollable area
          if (el[0].offsetHeight) {
            if (content[0].offsetHeight === content[0].scrollHeight) {
              el.trigger('click');
            }
          } else {
            // If there is an open/close toggle, wait until "that" is triggered
            let root = el.closest('.tree-item');
            let toggle;
            if (root.length && !root.hasClass('item-open') &&
              (toggle = root.find('.openclose')) && toggle.length) {
              // Listen for the toggle instead of timeouts
              toggle.one('click', function () {
                // Delay to ensure all event handlers have fired
                setTimeout(hide, 0);
              });
            } else { // Otherwise just detect visibility
              setTimeout(hide, 100);
            }
          }
        }();
      }
    }),
    '>...more</a>',
  ].join('');
});

Mustache.registerHelper('using', function (options) {
  let refreshQueue = new RefreshQueue();
  let frame = new can.Observe();
  let args = can.makeArray(arguments);
  let i;
  let arg;

  options = args.pop();

  if (options.hash) {
    for (i in options.hash) {
      if (options.hash.hasOwnProperty(i)) {
        arg = options.hash[i];
        arg = Mustache.resolve(arg);
        if (arg && arg.reify) {
          refreshQueue.enqueue(arg.reify());
          frame.attr(i, arg.reify());
        } else {
          frame.attr(i, arg);
        }
      }
    }
  }

  function finish() {
    return options.fn(options.contexts.add(frame));
  }

  return deferRender('span', finish, refreshQueue.trigger());
});

Mustache.registerHelper('with_mapping', function (binding, options) {
  let context = arguments.length > 2 ? resolveComputed(options) : this;
  let frame = new can.Observe();
  let loader;

  if (!context) { // can't find an object to map to.  Do nothing;
    return;
  }
  binding = Mustache.resolve(binding);
  loader = context.get_binding(binding);
  if (!loader) {
    return;
  }
  frame.attr(binding, loader.list);

  options = arguments[2] || options;

  function finish(list) {
    return options
      .fn(options.contexts.add(_.extend({}, frame, {results: list})));
  }
  function fail(error) {
    return options.inverse(options.contexts.add({error: error}));
  }

  return deferRender('span', {done: finish, fail: fail},
    loader.refresh_instances());
});

Mustache.registerHelper('person_roles', function (person, scope, options) {
  let rolesDeferred = new $.Deferred();
  let refreshQueue = new RefreshQueue();

  if (!options) {
    options = scope;
    scope = null;
  }

  person = Mustache.resolve(person);
  person = person.reify();
  refreshQueue.enqueue(person);
  // Force monitoring of changes to `person.user_roles`
  person.attr('user_roles');
  refreshQueue.trigger().then(function () {
    let userRoles = person.user_roles.reify();
    let userRolesRefreshQueue = new RefreshQueue();

    userRolesRefreshQueue.enqueue(userRoles);
    userRolesRefreshQueue.trigger().then(function () {
      let roles = can.map(
        can.makeArray(userRoles),
        function (userRole) {
          if (userRole.role) {
            return userRole.role.reify();
          }
        });
      let rolesRefreshQueue = new RefreshQueue();
      rolesRefreshQueue.enqueue(roles.splice());
      rolesRefreshQueue.trigger().then(function () {
        roles = can.map(can.makeArray(roles), function (role) {
          if (!scope || new RegExp(scope).test(role.scope)) {
            return role;
          }
        });

        //  "Superuser" roles are determined from config
        //  FIXME: Abstraction violation
        if ((!scope || new RegExp(scope).test('System'))
            && GGRC.config.BOOTSTRAP_ADMIN_USERS
            && ~GGRC.config.BOOTSTRAP_ADMIN_USERS.indexOf(person.email)) {
          roles.unshift({
            permission_summary: 'Superuser',
            name: 'Superuser',
          });
        }
        rolesDeferred.resolve(roles);
      });
    });
  });

  function finish(roles) {
    return options.fn({roles: roles});
  }

  return deferRender('span', finish, rolesDeferred);
});

Mustache.registerHelper('if_result_has_extended_mappings', function (
  bindings, parentInstance, options) {
  //  Render the `true` / `fn` block if the `result` exists (in this list)
  //  due to mappings other than directly to the `parentInstance`.  Otherwise
  //  Render the `false` / `inverse` block.
  bindings = Mustache.resolve(bindings);
  bindings = resolveComputed(bindings);
  parentInstance = Mustache.resolve(parentInstance);
  let hasExtendedMappings = false;
  let i;

  if (bindings && bindings.length > 0) {
    for (i=0; i<bindings.length; i++) {
      if (bindings[i].instance && parentInstance
          && bindings[i].instance.reify() !== parentInstance.reify()) {
        hasExtendedMappings = true;
      }
    }
  }

  if (hasExtendedMappings) {
    return options.fn(options.contexts);
  } else {
    return options.inverse(options.contexts);
  }
});

Mustache.registerHelper('each_with_extras_as', function (name, list, options) {
  //  Iterate over `list` and render the provided block with additional
  //  variables available in the context, specifically to enable joining with
  //  commas and using "and" in the right place.
  //
  //  * `<name>`: Instead of rendering with the item as the current context,
  //      make the item available at the specified `name`
  //  * index
  //  * length
  //  * isFirst
  //  * isLast
  name = Mustache.resolve(name);
  list = Mustache.resolve(list);
  list = resolveComputed(list);
  let i;
  let output = [];
  let frame;
  let length = list.length;

  for (i=0; i<length; i++) {
    frame = {
      index: i,
      isFirst: i === 0,
      isLast: i === length - 1,
      isSecondToLast: i === length - 2,
      length: length,
    };
    frame[name] = list[i];
    output.push(options.fn(new can.Observe(frame)));

    //  FIXME: Is this legit?  It seems necessary in some cases.
    // context = $.extend([], options.contexts, options.contexts.concat([frame]));
    // output.push(options.fn(context));
    // ...or...
    // contexts = options.contexts.concat([frame]);
    // contexts.___st4ck3d = true;
    // output.push(options.fn(contexts));
  }
  return output.join('');
});

Mustache.registerHelper('link_to_tree', function () {
  let args = [].slice.apply(arguments);
  args.pop();
  let link = [];

  args = can.map(args, Mustache.resolve);
  args = can.map(args, function (stub) {
    return stub.reify();
  });
  link.push('#' + args[0].constructor.table_singular + '_widget');
  //  FIXME: Add this back when extended-tree-routing is enabled
  // for (i=0; i<args.length; i++)
  //  link.push(args[i].constructor.table_singular + "-" + args[i].id);
  return link.join('/');
});

/**
 *  Helper for rendering date or datetime values in current local time
 *
 *  @param {boolean} hideTime - if set to true, render date only
 *  @return {String} - date or datetime string in the following format:
 *    * date: MM/DD/YYYY),
 *    * datetime (MM/DD/YYYY hh:mm:ss [PM|AM] [local timezone])
 */
Mustache.registerHelper('date', function (date, hideTime) {
  date = Mustache.resolve(date);
  return GGRC.Utils.formatDate(date, hideTime);
});

/**
 * Checks permissions.
 * Usage:
 *  {{#is_allowed ACTION [ACTION2 ACTION3...] RESOURCE_TYPE_STRING context=CONTEXT_ID}} content {{/is_allowed}}
 *  {{#is_allowed ACTION RESOURCE_INSTANCE}} content {{/is_allowed}}
 */
let allowedActions = ['create', 'read', 'update', 'delete',
  'view_object_page', '__GGRC_ADMIN__'];
Mustache.registerHelper('is_allowed', function () {
  let args = Array.prototype.slice.call(arguments, 0);
  let actions = [];
  let resource;
  let resourceType;
  let contextUnset = {};
  let contextId = contextUnset;
  let contextOverride;
  let options = args[args.length - 1];
  let passed = true;

  // Resolve arguments
  can.each(args, function (arg, i) {
    while (typeof arg === 'function' && arg.isComputed) {
      arg = arg();
    }

    if (typeof arg === 'string' && can.inArray(arg, allowedActions) > -1) {
      actions.push(arg);
    } else if (typeof arg === 'string') {
      resourceType = arg;
    } else if (typeof arg === 'object' && arg instanceof can.Model) {
      resource = arg;
    }
  });
  if (options.hash && options.hash.hasOwnProperty('context')) {
    contextId = options.hash.context;
    if (typeof contextId === 'function' && contextId.isComputed) {
      contextId = contextId();
    }
    if (contextId && typeof contextId === 'object' && contextId.id) {
      // Passed in the context object instead of the context ID, so use the ID
      contextId = contextId.id;
    }
    //  Using `context=null` in Mustache templates, when `null` is not defined,
    //  causes `context_id` to be `""`.
    if (contextId === '' || contextId === undefined) {
      contextId = null;
    } else if (contextId === 'for' || contextId === 'any') {
      contextOverride = contextId;
      contextId = undefined;
    }
  }

  if (resourceType && contextId === contextUnset) {
    throw new Error(
      'If `resource_type` is a string, `context` must be explicit');
  }
  if (actions.length === 0) {
    throw new Error('Must specify at least one action');
  }

  if (resource) {
    resourceType = resource.constructor.shortName;
    contextId = resource.context ? resource.context.id : null;
  }

  // Check permissions
  can.each(actions, function (action) {
    if (resource && Permission.is_allowed_for(action, resource)) {
      passed = true;
      return;
    }
    if (contextId !== undefined) {
      passed = passed && Permission.is_allowed(action, resourceType,
        contextId);
    }
    if (passed && contextOverride === 'for' && resource) {
      passed = passed && Permission.is_allowed_for(action, resource);
    } else if (passed && contextOverride === 'any' && resourceType) {
      passed = passed && Permission.is_allowed_any(action, resourceType);
    }
  });

  return passed ? options.fn(options.contexts || this) :
    options.inverse(options.contexts || this);
});

Mustache.registerHelper('any_allowed', function (action, data, options) {
  let passed = [];
  let hasPassed;
  data = resolveComputed(data);

  data.forEach(function (item) {
    passed.push(Permission.is_allowed_any(action, item.model_name));
  });
  hasPassed = passed.some(function (val) {
    return val;
  });
  return options[hasPassed ? 'fn' : 'inverse'](options.contexts || this);
});

Mustache.registerHelper('system_role', function (role, options) {
  role = role.toLowerCase();
  // If there is no user, it's same as No Role
  let userRole = (GGRC.current_user ?
    GGRC.current_user.system_wide_role : 'no access').toLowerCase();
  let isValid = role === userRole;

  return options[isValid ? 'fn' : 'inverse'](options.contexts || this);
});

Mustache.registerHelper('is_allowed_all',
  function (action, instances, options) {
    let passed = true;

    action = resolveComputed(action);
    instances = resolveComputed(instances);

    can.each(instances, function (instance) {
      let resourceType;
      let contextId;
      let baseMappings = [];

      if (instance instanceof GGRC.ListLoaders.MappingResult) {
        instance.walk_instances(function (inst, mapping) {
          if (can.reduce(mapping.mappings, function (a, b) {
            return a || (b.instance === true);
          }, false)) {
            baseMappings.push(inst);
          }
        });
      } else {
        baseMappings.push(instance);
      }

      can.each(baseMappings, function (instance) {
        resourceType = instance.constructor.shortName;
        contextId = instance.context ? instance.context.id : null;
        passed = passed && Permission
          .is_allowed(action, resourceType, contextId);
      });
    });

    if (passed) {
      return options.fn(options.contexts || this);
    } else {
      return options.inverse(options.contexts || this);
    }
  });

Mustache.registerHelper('is_allowed_to_map',
  function (source, target, options) {
    //  For creating mappings, we only care if the user has update permission on
    //  source and/or target.
    //  - `source` must be a model instance
    //  - `target` can be the name of the target model or the target instance
    let canMap;

    source = resolveComputed(source);
    target = resolveComputed(target);
    canMap = GGRC.Utils.allowed_to_map(source, target, options);

    if (canMap) {
      return options.fn(options.contexts || this);
    }
    return options.inverse(options.contexts || this);
  });

Mustache.registerHelper('is_allowed_to_map_task', (sourceType, options)=> {
  const mappableTypes = ['Program', 'Regulation', 'Policy', 'Standard',
    'Contract', 'Clause', 'Section', 'Request', 'Control', 'Objective',
    'OrgGroup', 'Vendor', 'AccessGroup', 'System', 'Process', 'DataAsset',
    'Product', 'Project', 'Facility', 'Market'];
  sourceType = resolveComputed(sourceType);

  if (mappableTypes.includes(sourceType)) {
    return options.fn(options.contexts);
  }
  return options.inverse(options.contexts);
});

function resolveComputed(maybeComputed, alwaysResolve) {
  return (typeof maybeComputed === 'function'
    && (maybeComputed.isComputed || alwaysResolve)) ?
    resolveComputed(maybeComputed(), alwaysResolve) : maybeComputed;
}

Mustache.registerHelper('attach_spinner', function (spinOpts, styles) {
  spinOpts = Mustache.resolve(spinOpts);
  styles = Mustache.resolve(styles);
  spinOpts = typeof spinOpts === 'string' ? JSON.parse(spinOpts) : {};
  styles = typeof styles === 'string' ? styles : '';
  return function (el) {
    let spinner = new Spinner(spinOpts).spin();
    $(el).append($(spinner.el).attr('style',
      $(spinner.el).attr('style') + ';' + styles)).data('spinner', spinner);
  };
});

Mustache.registerHelper('json_escape', function (obj, options) {
  let str = JSON.stringify(String(resolveComputed(obj) || ''));
  return str.substr(1, str.length - 2);
  /* return (""+(resolveComputed(obj) || ""))
    .replace(/\\/g, '\\')
    .replace(/"/g, '\\"')
    //  FUNFACT: JSON does not allow wrapping strings with single quotes, and
    //    thus does not allow backslash-escaped single quotes within strings.
    //    E.g., make sure attributes use double quotes, or use character
    //    entities instead -- but these aren't replaced by the JSON parser, so
    //    the output is not identical to input (hence, not using them now.)
    //.replace(/'/g, "\\'")
    //.replace(/"/g, '&#34;').replace(/'/g, "&#39;")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\u2028/g, "\\u2028") // Line separator
    .replace(/\u2029/g, "\\u2029") // Paragraph separator
    .replace(/\t/g, "\\t")
    .replace(/[\b]/g, "\\b")
    .replace(/\f/g, "\\f")
    .replace(/\v/g, "\\v");
  */
});

Mustache.registerHelper('json_stringify', function (obj, options) {
  let fields = (options.hash && options.hash.fields || '').split(',');
  obj = Mustache.resolve(obj);
  return JSON.stringify(_.pick(obj.serialize(), fields));
});

function localizeDate(date, options, tmpl, allowNonISO) {
  let formats = [
    'YYYY-MM-DD',
    'YYYY-MM-DDTHH:mm:ss',
    'YYYY-MM-DDTHH:mm:ss.SSSSSS',
  ];
  if (allowNonISO) {
    formats.push('MM/DD/YYYY', 'MM/DD/YYYY hh:mm:ss A');
  }
  if (!options) {
    return moment().format(tmpl);
  }
  date = resolveComputed(date);
  if (date) {
    if (typeof date === 'string') {
      // string dates are assumed to be in ISO format
      return moment.utc(date, formats, true)
        .format(tmpl);
    }
    return moment(new Date(date)).format(tmpl);
  }
  return '';
}

can.each({
  localize_date: 'MM/DD/YYYY',
  localize_datetime: 'MM/DD/YYYY hh:mm:ss A Z',
}, function (tmpl, fn) {
  Mustache.registerHelper(fn, function (date, allowNonISO, options) {
    // allowNonIso was not passed
    if (!options) {
      options = allowNonISO;
      allowNonISO = false;
    }
    return localizeDate(date, options, tmpl, allowNonISO);
  });
});

/**
 *  Helper for rendering date or 'Today' string.
 *
 *  @param {Date} value - the date object; if it's falsey the current (local) date is used
 *  @return {String} - 'Today' or date string in the following format: MM/DD/YYYY
 */
Mustache.registerHelper('localize_date_today', function (value) {
  let date = resolveComputed(value);
  let today = moment().startOf('day');
  let startOfDate = moment(date).startOf('day');
  // TODO: [Overdue] Move this logic to helper.
  if (!value || (date && today.diff(startOfDate, 'days') === 0)) {
    return 'Today';
  }
  return localizeDate(value, value, 'MM/DD/YYYY');
});

Mustache.registerHelper('capitalize', function (value, options) {
  value = resolveComputed(value) || '';
  return can.capitalize(value);
});

Mustache.registerHelper('lowercase', function (value, options) {
  value = resolveComputed(value) || '';
  return value.toLowerCase();
});

Mustache.registerHelper('assignee_types', function (value, options) {
  function capitalizeFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
  value = resolveComputed(value) || '';
  value = _.first(_.map(value.split(','), function (type) {
    let lowercaseType = _.trim(type).toLowerCase();

    if (lowercaseType === 'assessor') {
      lowercaseType = 'assignee';
    }

    return lowercaseType;
  }));
  return _.isEmpty(value) ? '' : '(' + capitalizeFirst(value) + ')';
});

Mustache.registerHelper('visibility_delay', function (delay, options) {
  delay = resolveComputed(delay);

  return function (el) {
    setTimeout(function () {
      if ($(el.parentNode).is(':visible')) {
        $(el).append(options.fn(options.contexts));
      }
      can.view.hookup($(el).children()); // FIXME dubious indentation - was this intended to be in the 'if'?
    }, delay);
    return el;
  };
});

Mustache.registerHelper('is_dashboard', function (options) {
  return /dashboard/.test(window.location) ?
    options.fn(options.contexts) :
    options.inverse(options.contexts);
});

Mustache.registerHelper('is_allobjectview', function (options) {
  return /objectBrowser/.test(window.location) ?
    options.fn(options.contexts) :
    options.inverse(options.contexts);
});

Mustache.registerHelper('is_dashboard_or_all', function (options) {
  return (/dashboard/.test(window.location) ||
    /objectBrowser/.test(window.location)) ?
    options.fn(options.contexts) :
    options.inverse(options.contexts);
});

Mustache.registerHelper('isMyAssessments', function (options) {
  return isMyAssessments() ?
    options.fn(options.contexts) :
    options.inverse(options.contexts);
});

Mustache.registerHelper('is_admin_page', (options) => {
  return isAdmin() ?
    options.fn(options.contexts) :
    options.inverse(options.contexts);
});

Mustache.registerHelper('is_profile', function (parentInstance, options) {
  if (options) {
    resolveComputed(parentInstance);
  } else {
    options = parentInstance;
  }

  if (GGRC.page_instance() instanceof CMS.Models.Person) {
    return options.fn(options.contexts);
  } else {
    return options.inverse(options.contexts);
  }
});

Mustache.registerHelper('is_parent_of_type', function (typeOptions, options) {
  /*
  Determines if parent instance is of specified type.
  Input:   typeOptions = 'TypeA,TypeB,TypeC'
  Returns: Boolean
  */
  let types = typeOptions.split(',');
  let parent = GGRC.page_instance();
  let parentType = parent.type;

  if ($.inArray(parentType, types) !== -1) {
    return options.fn(options.contexts);
  }
  return options.inverse(options.contexts);
});

Mustache.registerHelper('current_user_is_admin', function (options) {
  if (Permission.is_allowed('__GGRC_ADMIN__')) {
    return options.fn(options.contexts);
  }
  return options.inverse(options.contexts);
});

Mustache.registerHelper('owned_by_current_user', function (instance, options) {
  let currentUserId = GGRC.current_user.id;
  let owners;
  instance = Mustache.resolve(instance);
  owners = instance.attr('owners');
  if (owners) {
    for (let i = 0; i < owners.length; i++) {
      if (currentUserId === owners[i].id) {
        return options.fn(options.contexts);
      }
    }
  }
  return options.inverse(options.contexts);
});

Mustache.registerHelper('last_approved', function (instance, options) {
  let loader;
  let frame = new can.Observe();
  instance = Mustache.resolve(instance);
  loader = instance.get_binding('approval_tasks');

  frame.attr(instance, loader.list);
  function finish(list) {
    let item;
    list = list.serialize();
    if (list.length > 1) {
      let biggest = Math.max(...list.map(function (item) {
        return item.instance.id;
      }));
      item = list.filter(function (item) {
        return item.instance.id === biggest;
      });
    }
    item = item ? item[0] : list[0];
    return options.fn(item ? item : options.contexts);
  }
  function fail(error) {
    return options.inverse(options.contexts.add({error: error}));
  }

  return deferRender('span', {done: finish, fail: fail},
    loader.refresh_instances());
});

Mustache.registerHelper('with_is_reviewer', function (reviewTask, options) {
  let assigneeRole = getRole('CycleTaskGroupObjectTask', 'Task Assignees');
  let currentUserId = GGRC.current_user.id;
  let isReviewer;

  reviewTask = Mustache.resolve(reviewTask);

  isReviewer = reviewTask &&
      (_.some(reviewTask.access_control_list, function (acl) {
        return acl.ac_role_id === assigneeRole.id &&
          acl.person &&
          acl.person.id === currentUserId;
      }) ||
      Permission.is_allowed('__GGRC_ADMIN__'));
  return options.fn(options.contexts.add({is_reviewer: isReviewer}));
});

Mustache.registerHelper('with_review_task', function (options) {
  let tasks = options.contexts.attr('approval_tasks');
  tasks = Mustache.resolve(tasks);
  if (tasks) {
    for (let i = 0; i < tasks.length; i++) {
      return options.fn(options.contexts.add({review_task: tasks[i].instance}));
    }
  }
  return options.fn(options.contexts.add({review_task: undefined}));
});

Mustache.registerHelper('default_audit_title', function (instance, options) {
  let index;
  let program;
  let title;

  instance = Mustache.resolve(instance);
  program = instance.attr('program');

  if (!instance._transient) {
    instance.attr('_transient', new can.Map());
  }

  if (!program) {
    // Mark the title to be populated when computed_program is defined,
    // returning an empty string here would disable the save button.
    instance.attr('title', '');
    instance.attr('_transient.default_title', instance.title);
    return;
  }
  if (instance._transient.default_title !== instance.title) {
    return;
  }

  program = program.reify();
  new RefreshQueue().enqueue(program).trigger().then(function () {
    title = (new Date()).getFullYear() + ': ' + program.title + ' - Audit';

    GGRC.Models.Search.counts_for_types(title, ['Audit'])
      .then(function (result) {
        // Next audit index should be bigger by one than previous, we have unique name policy
        index = result.getCountFor('Audit') + 1;
        title = title + ' ' + index;
        instance.attr('title', title);
        // this needs to be different than above, otherwise CanJS throws a strange error
        if (instance._transient) {
          instance.attr('_transient.default_title',
            instance.title);
        }
      });
  });
});

Mustache.registerHelper('urlPath', function () {
  return window.location.pathname;
});

Mustache.registerHelper('sum', function () {
  let sum = 0;
  for (let i = 0; i < arguments.length - 1; i++) {
    sum += parseInt(resolveComputed(arguments[i]), 10);
  }
  return String(sum);
});

/*
  Evaluates multiple helpers as if they were a single condition

  Each new statement is begun with a newline-prefixed string. The type of logic
  to apply as well as whether it should be a truthy or falsy evaluation may also
  be included with the statement in addition to the helper name.

  Currently, if_helpers only supports Disjunctive Normal Form. All "and" statements are grouped,
  groups are split by "or" statements.

  All hash arguments (some_val=37) must go in the last line and should be prefixed by the
  zero-based index of the corresponding helper. This is necessary because all hash arguments
  are required to be the final arguments for a helper. Here's an example:
    _0_some_val=37 would pass some_val=37 to the first helper.

  Statement syntax:
    '\
    [LOGIC] [TRUTHY_FALSY]HELPER_NAME' arg1 arg2 argN

  Defaults:
    LOGIC = and (accepts: and or)
    TRUTHY_FALSEY = # (accepts: # ^)
    HELPER_NAME = some_helper_name

  Example:
    {{#if_helpers '\
      #if_match' page_object.constructor.shortName 'Project' '\
      and ^if_match' page_object.constructor.shortName 'Audit|Program|Person' '\
    ' _1_hash_arg_for_second_statement=something}}
      matched all conditions
    {{else}}
      failed
    {{/if_helpers}}

  FIXME: Only synchronous helpers (those which call options.fn() or options.inverse()
    without yielding the thread through deferRender or otherwise) can currently be used
    with if_helpers.  if_helpers should support all helpers by changing the walk through
    conjunctions and disjunctions to one using a can.reduce(Array, function (Deferred, item) {}, $.when())
    pattern instead of can.reduce(Array, function (Boolean, item) {}, Boolean) pattern. --BM 8/29/2014
*/
Mustache.registerHelper('if_helpers', function () {
  let args = arguments;
  let options = arguments[arguments.length - 1];
  let helperResult;
  let helperOptions = can.extend({}, options, {
    fn: function () {
      helperResult = 'fn';
    },
    inverse: function () {
      helperResult = 'inverse';
    },
  });

  // Parse statements
  let statements = [];
  let statement;
  let match;
  let disjunctions = [];
  let index = 0;

  can.each(args, function (arg, i) {
    if (i < args.length - 1) {
      if (typeof arg === 'string' && arg.match(/^\n\s*/)) {
        if (statement) {
          if (statement.logic === 'or') {
            disjunctions.push(statements);
            statements = [];
          }
          statements.push(statement);
          index = index + 1;
        }
        if (match = arg.match(/^\n\s*((and|or) )?([#^])?(\S+?)$/)) {
          statement = {
            fn_name: match[3] === '^' ? 'inverse' : 'fn',
            helper: Mustache.getHelper(match[4], options.contexts),
            args: [],
            logic: match[2] === 'or' ? 'or' : 'and',
          };

          // Add hash arguments
          if (options.hash) {
            let hash = {};
            let prefix = '_' + index + '_';
            let prop;

            for (prop in options.hash) {
              if (prop.indexOf(prefix) === 0) {
                hash[prop.substr(prefix.length)] = options.hash[prop];
              }
            }
            if (!$.isEmptyObject(hash)) {
              statement.hash = hash;
            }
          }
        } else {
          statement = null;
        }
      } else if (statement) {
        statement.args.push(arg);
      }
    }
  });
  if (statement) {
    if (statement.logic === 'or') {
      disjunctions.push(statements);
      statements = [];
    }
    statements.push(statement);
  }
  disjunctions.push(statements);

  if (disjunctions.length) {
    // Evaluate statements
    let result = can.reduce(disjunctions,
      function (disjunctiveResult, conjunctions) {
        if (disjunctiveResult) {
          return true;
        }

        let conjunctiveResult = can.reduce(conjunctions,
          function (currentResult, stmt) {
            if (!currentResult) {
              return false; // short circuit
            }

            helperResult = null;
            stmt.helper.fn(...stmt.args.concat([
              can.extend({}, helperOptions,
                {hash: stmt.hash || helperOptions.hash}),
            ]));
            helperResult = helperResult === stmt.fn_name;
            return currentResult && helperResult;
          }, true);
        return disjunctiveResult || conjunctiveResult;
      }, false);

    // Execute based on the result
    if (result) {
      return options.fn(options.contexts);
    } else {
      return options.inverse(options.contexts);
    }
  }
});

Mustache.registerHelper('with_model_as',
  function (varName, modelName, options) {
    let frame = {};
    modelName = resolveComputed(Mustache.resolve(modelName));
    frame[varName] = CMS.Models[modelName];
    return options.fn(options.contexts.add(frame));
  });

// Verify if the Program has multiple owners
// Usage: {{#if_multi_owner instance modalTitle}}
Mustache.registerHelper('if_multi_owner',
  function (instance, modalTitle, options) {
    let ownerCount = 0;

    if (resolveComputed(modalTitle).indexOf('New ') === 0) {
      return options.inverse(options.contexts);
    }

    let loader = resolveComputed(instance).get_binding('authorizations');
    can.each(loader.list, function (binding) {
      if (binding.instance.role && binding.instance.role.reify()
        .attr('name') === 'ProgramOwner') {
        ownerCount += 1;
      }
    });

    if (ownerCount > 1) {
      return options.fn(options.contexts);
    } else {
      return options.inverse(options.contexts);
    }
  });

// Determines whether the value matches one in the $.map'd list
// {{#if_in_map roles 'role.permission_summary' 'Mapped'}}
Mustache.registerHelper('if_in_map', function (list, path, value, options) {
  list = resolveComputed(list);

  if (!list.attr || list.attr('length')) {
    path = path.split('.');
    let map = $.map(list, function (obj) {
      can.each(path, function (prop) {
        obj = (obj && obj[prop]) || null;
      });
      return obj;
    });

    if (map.indexOf(value) > -1) {
      return options.fn(options.contexts);
    }
  }
  return options.inverse(options.contexts);
});

Mustache.registerHelper('if_in', function (needle, haystack, options) {
  needle = resolveComputed(needle);
  haystack = resolveComputed(haystack).split(',');

  let found = haystack.some(function (hay) {
    return hay.trim() === needle;
  });
  return options[found ? 'fn' : 'inverse'](options.contexts);
});

Mustache.registerHelper('if_instance_of', function (inst, cls, options) {
  let result;
  cls = resolveComputed(cls);
  inst = resolveComputed(inst);

  if (typeof cls === 'string') {
    cls = cls.split('|').map(function (cl) {
      return CMS.Models[cl];
    });
  } else if (typeof cls !== 'function') {
    cls = [cls.constructor];
  } else {
    cls = [cls];
  }

  result = can.reduce(cls, function (res, cl) {
    return res || inst instanceof cl;
  }, false);

  return options[result ? 'fn' : 'inverse'](options.contexts);
});

Mustache.registerHelper('prune_context', function (options) {
  return options.fn(new can.view.Scope(options.context));
});

Mustache.registerHelper('mixed_content_check', function (url, options) {
  url = Mustache.getHelper('schemed_url', options.contexts).fn(url);
  if (window.location.protocol === 'https:' && !/^https:/.test(url)) {
    return options.inverse(options.contexts);
  } else {
    return options.fn(options.contexts);
  }
});

Mustache.registerHelper('ggrc_config_value', function (key, default_, options) {
  key = resolveComputed(key);
  if (!options) {
    options = default_;
    default_ = null;
  }
  default_ = resolveComputed(default_);
  default_ = default_ || '';
  return can.getObject(key, [GGRC.config]) || default_;
});

Mustache.registerHelper('if_config_exist', function (key, options) {
  key = resolveComputed(key);
  let configValue = can.getObject(key, [GGRC.config]);

  return configValue ?
    options.fn(options.contexts) :
    options.inverse(options.contexts);
});

Mustache.registerHelper('switch', function (value, options) {
  let frame = new can.Observe({});
  value = resolveComputed(value);
  frame.attr(value || 'default', true);
  frame.attr('default', true);
  return options.fn(options.contexts.add(frame), {
    helpers: {
      'case': function (val, options) {
        val = resolveComputed(val);
        if (options.context[val]) {
          options.context.attr ? options.context.attr('default', false) :
            (options.context.default = false);
          return options.fn(options.contexts);
        }
      },
    },
  });
});

Mustache.registerHelper('current_cycle_assignee',
  function (instance, options) {
    let mapping;
    let approvalCycle;
    let binding;
    let finish;
    let progress;

    instance = Mustache.resolve(instance);
    mapping = instance.get_mapping('current_approval_cycles');

    if (!mapping || !mapping.length) {
      return options.inverse();
    }
    approvalCycle = mapping[0].instance;
    binding = approvalCycle.get_binding('cycle_task_groups');

    finish = function (tasks) {
      return options.fn(options.contexts.add({
        person: tasks[0].instance.contact,
      }));
    };
    progress = function () {
      return options.inverse(options.contexts);
    };

    return deferRender('span', {
      done: finish, progress: progress,
    }, binding.refresh_instances());
  });

Mustache.registerHelper('with_mapping_count',
  function (instance, mappingName, options) {
    let relevant;
    let dfd;

    mappingName = Mustache.resolve(mappingName);
    instance = Mustache.resolve(instance);

    relevant = {
      id: instance.id,
      type: instance.type,
    };
    dfd = batchRequests(buildCountParams([mappingName], relevant)[0]);
    return deferRender('span', {
      done: function (count) {
        return options.fn(options.contexts.add({
          count: count[mappingName].count}));
      },
      progress: function () {
        return options.inverse(options.contexts);
      },
    },
    dfd);
  });

Mustache.registerHelper('log', function () {
  let args = can.makeArray(arguments).slice(0, arguments.length - 1);
  console.log(...['Mustache log']
    .concat(_.map(args, function (arg) {
      return resolveComputed(arg);
    })));
});

Mustache.registerHelper('autocomplete_select', function (disableCreate, opt) {
  let cls;
  let options = arguments[arguments.length - 1];
  let _disableCreate = Mustache.resolve(disableCreate);

  if (typeof (_disableCreate) !== 'boolean') {
    _disableCreate = false;
  }
  if (options.hash && options.hash.controller) {
    cls = Mustache.resolve(cls);
    if (typeof cls === 'string') {
      cls = can.getObject(cls);
    }
  }
  return function (el) {
    $(el).bind('inserted', function () {
      let $ctl = $(this).parents(':data(controls)');
      $(this).ggrc_autocomplete($.extend({}, options.hash, {
        controller: cls ? $ctl.control(cls) : $ctl.control(),
        disableCreate: _disableCreate,
      }));
    });
  };
});

Mustache.registerHelper('grdive_msg_to_id', function (message) {
  let msg = Mustache.resolve(message);

  if (!msg) {
    return;
  }

  msg = msg.split(' ');
  return msg[msg.length-1];
});

Mustache.registerHelper('disable_if_errors', function (instance) {
  let ins;
  let res;
  ins = Mustache.resolve(instance);
  res = ins.computed_unsuppressed_errors();
  if (res === null || res === undefined) {
    return '';
  } else {
    return 'disabled';
  }
});

/*
  toggle mustache helper

  An extended "if" that sets up a "toggle_button" trigger, which can
  be applied to any button rendered within the section bounded by the
  toggle call.  toggle_buttons set the value of the toggle value to its
  boolean opposite.  Note that external forces can also set this value
  and thereby flip the toggle -- this helper is friendly to those cases.

  @helper_type section -- use outside of element tags.

  @param compute some computed value to flip between true and false
*/
Mustache.registerHelper('toggle', function (compute, options) {
  function toggle(trigger) {
    if (typeof trigger === 'function') {
      trigger = Mustache.resolve(trigger);
    }
    if (typeof trigger !== 'string') {
      trigger = 'click';
    }
    return function (el) {
      $(el).bind(trigger, function () {
        compute(compute() ? false : true);
      });
    };
  }

  if (compute()) {
    return options.fn(
      options.contexts, {helpers: {toggle_button: toggle}});
  } else {
    return options.inverse(
      options.contexts, {helpers: {toggle_button: toggle}});
  }
});

Mustache.registerHelper('iterate_by_two', function (list, options) {
  let i;
  let arr;
  let output = [];
  list = Mustache.resolve(list);

  for (i = 0; i < list.length; i+=2) {
    if ((i + 1) === list.length) {
      arr = [list[i]];
    } else {
      arr = [list[i], list[i+1]];
    }
    output.push(options.fn(
      options.contexts.add({list: arr})));
  }
  return output.join('');
});

/**
 * Helper method for determining the file type of a Document object from its
 * file name extension.
 *
 * @param {Object} instance - an instance of a model object of type "Document"
 * @return {String} - determined file type or "default" for unknown/missing
 *   file name extensions.
 *
 * @throws {String} If the type of the `instance` is not "Document" or if its
 *   "title" attribute is empty.
 */
Mustache.registerHelper('file_type', function (instance) {
  let extension;
  let filename;
  let parts;
  let DEFAULT_VALUE = 'default';
  let FILE_EXTENSION_TYPES;
  let FILE_TYPES;

  FILE_TYPES = Object.freeze({
    PLAIN_TXT: 'txt',
    IMAGE: 'img',
    PDF: 'pdf',
    OFFICE_DOC: 'doc',
    OFFICE_SHEET: 'xls',
    ARCHIVE: 'zip',
  });

  FILE_EXTENSION_TYPES = Object.freeze({
    // plain text files
    txt: FILE_TYPES.PLAIN_TXT,

    // image files
    jpg: FILE_TYPES.IMAGE,
    jpeg: FILE_TYPES.IMAGE,
    png: FILE_TYPES.IMAGE,
    gif: FILE_TYPES.IMAGE,
    bmp: FILE_TYPES.IMAGE,
    tiff: FILE_TYPES.IMAGE,

    // PDF documents
    pdf: FILE_TYPES.PDF,

    // Office-like text documents
    doc: FILE_TYPES.OFFICE_DOC,
    docx: FILE_TYPES.OFFICE_DOC,
    odt: FILE_TYPES.OFFICE_DOC,

    // Office-like spreadsheet documents
    xls: FILE_TYPES.OFFICE_SHEET,
    xlsx: FILE_TYPES.OFFICE_SHEET,
    ods: FILE_TYPES.OFFICE_SHEET,

    // archive files
    zip: FILE_TYPES.ARCHIVE,
    rar: FILE_TYPES.ARCHIVE,
    '7z': FILE_TYPES.ARCHIVE,
    gz: FILE_TYPES.ARCHIVE,
    tar: FILE_TYPES.ARCHIVE,
  });

  if (instance.type !== 'Document') {
    throw new Error('Cannot determine file type for a non-document object');
  }

  filename = instance.title || '';
  if (!filename) {
    throw new Error("Cannot determine the object's file name");
  }

  parts = filename.split('.');
  extension = (parts.length === 1) ? '' : parts[parts.length - 1];
  extension = extension.toLowerCase();

  return FILE_EXTENSION_TYPES[extension] || DEFAULT_VALUE;
});

Mustache.registerHelper('debugger', function () {
  // This just gives you a helper that you can wrap around some code in a
  // template to see what's in the context. Dev tools need to be open for this
  // to work (in Chrome at least).
  debugger;

  let options = arguments[arguments.length - 1];
  return options.fn(options.contexts);
});

Mustache.registerHelper('update_link', function (instance, options) {
  instance = Mustache.resolve(instance);
  if (instance.viewLink) {
    let link = window.location.host + instance.viewLink;
    instance.attr('link', link);
  }
  return options.fn(options.contexts);
});

Mustache.registerHelper('with_most_recent_declining_task_entry',
  function (reviewTask, options) {
    let entries = reviewTask.get_mapping('declining_cycle_task_entries');
    let mostRecentEntry;

    if (entries) {
      for (let i = entries.length - 1; i >= 0; i--) {
        let entry = entries[i];
        if ('undefined' !== typeof mostRecentEntry) {
          if (moment(mostRecentEntry.created_at)
            .isBefore(moment(entry.created_at))) {
            mostRecentEntry = entry;
          }
        } else {
          mostRecentEntry = entry;
        }
      }
    }

    if (mostRecentEntry) {
      return options.fn(options.contexts
        .add({most_recent_declining_task_entry: mostRecentEntry}));
    }
    return options.fn(options.contexts
      .add({most_recent_declining_task_entry: {}}));
  });

Mustache.registerHelper('if_less', function (a, b, options) {
  a = Mustache.resolve(a);
  b = Mustache.resolve(b);

  if (a < b) {
    return options.fn(options.contexts);
  } else {
    return options.inverse(options.contexts);
  }
});

Mustache.registerHelper('add_index', function (index, increment, options) {
  index = Mustache.resolve(index);
  increment = Mustache.resolve(increment);

  return (index + increment);
});

function getProperUrl(url) {
  let domain;
  let maxLabel;
  let urlSplit;

  if (!url) {
    return '';
  }

  if (!url.match(/^[a-zA-Z]+:/)) {
    url = (window.location.protocol === 'https:' ?
      'https://' : 'http://') + url;
  }

  // Make sure we can find the domain part of the url:
  urlSplit = url.split('/');
  if (urlSplit.length < 3) {
    return 'javascript://';
  }

  domain = urlSplit[2];
  maxLabel = _.max(domain.split('.').map(function (label) {
    return label.length;
  }));
  if (maxLabel > 63 || domain.length > 253) {
    // The url is invalid and might crash user's chrome tab
    return 'javascript://';
  }
  return url;
}

Mustache.registerHelper('get_url_value', function (attrName, instance) {
  instance = Mustache.resolve(instance);
  attrName = Mustache.resolve(attrName);

  if (instance[attrName]) {
    if (['url', 'reference_url'].indexOf(attrName) !== -1) {
      return getProperUrl(instance[attrName]);
    }
  }
  return '';
});

/**
   * Retrieve the string value of an attribute of the given instance.
   *
   * The method only supports instance attributes categorized as "default",
   * and does not support (read: not work for) nested object references.
   *
   * If the attribute does not exist or is not considered
   * to be a "default" attribute, an empty string is returned.
   *
   * If the attribute represents a date information, it is returned in the
   * MM/DD/YYYY format.
   *
   * @param {String} attrName - the name of the attribute to retrieve
   * @param {Object} instance - an instance of a model object
   * @return {String} - the retrieved attribute's value
   */
Mustache.registerHelper('get_default_attr_value',
  function (attrName, instance) {
    // attribute names considered "default" and representing a date
    let DATE_ATTRS = Object.freeze({
      due_on: 1,
      end_date: 1,
      finished_date: 1,
      start_date: 1,
      updated_at: 1,
      verified_date: 1,
      last_deprecated_date: 1,
    });

      // attribute names considered "default" and not representing a date
    let NON_DATE_ATTRS = Object.freeze({
      kind: 1,
      title: 1,
      label: 1,
      reference_url: 1,
      request_type: 1,
      slug: 1,
      status: 1,
      url: 1,
      verified: 1,
      os_state: 1,
      archived: 1,
      last_comment: 1,
    });

    let res;

    instance = Mustache.resolve(instance);
    attrName = Mustache.resolve(attrName);

    res = instance.attr(attrName);

    if (res !== undefined && res !== null) {
      if (attrName in NON_DATE_ATTRS) {
        if ($.type(res) === 'boolean') {
          res = String(res);
        }
        return res;
      }
      if (attrName in DATE_ATTRS) {
        // convert to a localized date
        return moment(res).format('MM/DD/YYYY');
      }
    }

    return '';
  }
);

Mustache.registerHelper('pretty_role_name', function (name) {
  name = Mustache.resolve(name);
  let ROLE_LIST = {
    ProgramOwner: 'Program Manager',
    ProgramEditor: 'Program Editor',
    ProgramReader: 'Program Reader',
    WorkflowOwner: 'Workflow Manager',
    WorkflowMember: 'Workflow Member',
    Mapped: 'No Role',
    Owner: 'Manager',
  };
  if (ROLE_LIST[name]) {
    return ROLE_LIST[name];
  }
  return name;
});

Mustache.registerHelper('role_scope', function (scope) {
  scope = Mustache.resolve(scope);

  if (scope === 'Private Program') {
    return 'Program';
  }
  return scope;
});

/*
Add new variables to current scope. This is useful for passing variables
to initialize a tree view.

Example:
  {{#add_to_current_scope example1="a" example2="b"}}
    {{log .}} // {example1: "a", example2: "b"}
  {{/add_to_current_scope}}
*/
Mustache.registerHelper('add_to_current_scope', function (options) {
  return options.fn(options.contexts
    .add(_.extend({}, options.context, options.hash)));
});

/**
   * Return a value of a CMS.Model constructor's property.
   *
   * If a Model is not found, an error is raised. If a property does not exist
   * on the model, undefined is returned.
   *
   * @param {String} modelName - the name of the Model to inspect
   * @param {String} attr - the name of a modelName's property
   *
   * @return {*} - the value of the modelName[attr]
   */
Mustache.registerHelper('model_info', function (modelName, attr, options) {
  let model;

  if (arguments.length !== 3) {
    throw new Error(
      'Invalid number of arguments (' +
        (arguments.length - 1) + // do not count the auto-provided options arg
        '), expected 2.');
  }

  modelName = Mustache.resolve(modelName);
  model = CMS.Models[modelName];

  if (typeof model === 'undefined') {
    throw new Error('Model not found (' + modelName + ').');
  }

  return model[attr];
});

/*
Add spaces to a CamelCase string.

Example:
{{un_camel_case "InProgress"}} becomes "In Progress"
*/
Mustache.registerHelper('un_camel_case', function (str, toLowerCase) {
  let value = Mustache.resolve(str);
  toLowerCase = typeof toLowerCase !== 'object';
  if (!value) {
    return value;
  }
  value = value.replace(/([A-Z]+)/g, ' $1').replace(/([A-Z][a-z])/g, ' $1');
  return toLowerCase ? value.toLowerCase() : value;
});

/**
   * Check if the current user is allowed to edit a comment, and render the
   * corresponding block in the template.
   *
   * Example usage:
   *
   *   {{#canEditComment commentInstance parentIntance}}
   *     ... (display e.g. an edit button) ...
   *   {{else}}
   *     ... (no edit button) ...
   *   {{/canEditComment}}
   *
   * @param {can.Model} comment - the Comment instance to check
   * @param {can.Model} parentInstance - the object the comment was posted
   *    under, e.g. an Assessment or a Request instance
   * @param {Object} options - a CanJS options argument passed to every helper
   *
   */
Mustache.registerHelper('canEditComment',
  function (comment, parentInstance, options) {
    let END_STATES = Object.freeze({
      Verified: true,
      Completed: true,
    });

    let canEdit = true;
    let isAdmin = Permission.is_allowed('__GGRC_ADMIN__');

    comment = Mustache.resolve(comment);
    parentInstance = Mustache.resolve(parentInstance);

    if (!Permission.is_allowed_for('update', comment)) {
      canEdit = false;
    } else if (!isAdmin && parentInstance.status in END_STATES) {
      // non-administrators cannot edit comments if the underlying object is
      // in final or verfiied state
      canEdit = false;
    }

    if (canEdit) {
      return options.fn(options.context);
    }

    return options.inverse(options.context);
  }
);

/**
   * Checks if two object types are mappable
   *
   * @param {String} source - Source type
   * @param {String} target - Target type
   * @param {Object} options - a CanJS options argument passed to every helper
   */
Mustache.registerHelper('is_mappable_type',
  function (source, target, options) {
    target = Mustache.resolve(target);
    source = Mustache.resolve(source);
    if (GGRC.Utils.isMappableType(source, target)) {
      return options.fn(options.contexts);
    }
    return options.inverse(options.contexts);
  }
);

/**
   * Check if property's value did not pass validation, and render the
   * corresponding block in the template. The error messages, if any, are
   * available in the "error" variable within the "truthy" block.
   *
   * Example usage:
   *
   *   {{#validation_error validationErrors propertyName}}
   *     Invalid value for the property {{propertyName}}: {{errors.0}}
   *   {{else}}
   *     Hooray, no errors, a correct value is set!
   *   {{/validation_error}}
   *
   * @param {Object} validationErrors - an object containing validation results
   *   of a can.Model instance
   * @param {Number} propertyName - Name of the property to check for
   *   validation errors
   * @param {Object} options - a CanJS options argument passed to every helper
   */
Mustache.registerHelper(
  'validation_error',
  function (validationErrors, propertyName, options) {
    let errors;
    let property;
    let contextStack;

    validationErrors = Mustache.resolve(validationErrors) || {};
    if (_.isFunction(validationErrors)) {
      validationErrors = Mustache.resolve(validationErrors) || {};
    }

    property = Mustache.resolve(propertyName);
    errors = validationErrors[property] || [];

    if (errors.length > 0) {
      contextStack = options.contexts.add({errors: errors});
      return options.fn(contextStack);
    }
    return options.inverse(options.contexts);
  }
);

Mustache.registerHelper('isNotInScopeModel', function (modelName, options) {
  let isInScope;
  modelName = can.isFunction(modelName) ? modelName() : modelName;
  isInScope = isInScopeModel(modelName);
  // Temporary Modification to remove possibility to unmap Audit
  isInScope = isInScope || isSnapshotParent(modelName);
  return isInScope ? options.inverse(this) : options.fn(this);
});

/**
   * Check if a person is contained in the given authorization list and render
   * the corresponding Mustache block.
   *
   * Example usage:
   *
   *   {{#isInAuthList assignee approvedEditors}}
   *     <Edit button here...>
   *   {{else}}
   *     Editing not allowed.
   *   {{/isInAuthList}}
   *
   * @param {CMS.Models.Person} person - the user to check for an authorization
   * @param {Array} authList - the list of authorization grants
   * @param {Object} options - a CanJS options argument passed to every helper
   */
Mustache.registerHelper(
  'isInAuthList',
  function (person, authList, options) {
    let emails;

    person = Mustache.resolve(person) || {};
    authList = Mustache.resolve(authList) || [];

    emails = _.map(authList, function (item) {
      let person = item.instance.person.reify();
      return person.email;
    });

    if (_.includes(emails, person.email)) {
      return options.fn(options.contexts);
    }
    return options.inverse(options.contexts);
  }
);

Mustache.registerHelper('modifyFieldTitle', function (type, field, options) {
  let titlesMap = {
    Cycle: 'Cycle ',
    CycleTaskGroup: 'Group ',
    CycleTaskGroupObjectTask: 'Task ',
  };
  type = Mustache.resolve(type);

  return titlesMap[type] ? titlesMap[type] + field : field;
});

Mustache.registerHelper(
  'withRoleForInstance',
  function (instance, roleName, options) {
    let userId = GGRC.current_user.id;
    let internalRoles = GGRC.internal_access_control_roles;
    let role;
    let hasRole;
    instance = resolveComputed(instance);
    roleName = resolveComputed(roleName);
    role = internalRoles.find((a) => a.name === roleName);

    if (!role) {
      console.warn(roleName, 'is not an internal access control name');
      return;
    }

    // As a Creator user we seem to invoke this helper with a null instance.
    // In this case we simply return and wait for the helper to be invoked a
    // second time with the proper instance object.
    if (!instance) {
      return;
    }
    hasRole = instance.access_control_list.filter((acl) => {
      return acl.ac_role_id === role.id && acl.person_id === userId;
    }).length > 0;

    return options.fn(options.contexts.add({
      hasRole: hasRole,
    }));
  });

Mustache.registerHelper('displayWidgetTab',
  function (widget, instance, options) {
    let displayTab;
    let inForceShowList;
    widget = Mustache.resolve(widget);
    instance = Mustache.resolve(instance);

    inForceShowList = can.inArray(widget.attr('internav_display'),
      instance.constructor.obj_nav_options.force_show_list) > -1;

    displayTab = widget.attr('has_count') &&
        widget.attr('count') ||
        widget.attr('uncountable') ||
        widget.attr('force_show') ||
        instance.constructor.obj_nav_options.show_all_tabs ||
        inForceShowList;

    if (!displayTab) {
      return options.inverse(options.contexts);
    }

    return options.fn(options.contexts);
  }
);
Mustache.registerHelper('is_auditor', function (options) {
  const auditor = getRole('Audit', 'Auditors');
  const audit = GGRC.page_instance();
  if (audit.type !== 'Audit') {
    console.warn('is_auditor called on non audit page');
    return options.inverse(options.contexts);
  }
  const isAuditor = audit.access_control_list.filter(
    (acl) => acl.ac_role_id === auditor.id &&
                 acl.person_id === GGRC.current_user.id).length;

  if (isAuditor) {
    return options.fn(options.contexts);
  }
  return options.inverse(options.contexts);
});

Mustache.registerHelper('user_roles', (person, parentInstance, options) => {
  const allRoles = GGRC.access_control_roles.concat(
    GGRC.internal_access_control_roles);
  let roles = {};
  let allRoleNames = [];

  if (!options) {
    // if parent instance is not defined in helper use page instance
    options = parentInstance;
    parentInstance = Mustache.resolve(GGRC.page_instance);
  } else {
    parentInstance = Mustache.resolve(parentInstance);
  }

  can.each(allRoles, (role) => {
    roles[role.id] = role;
  });

  person = Mustache.resolve(person);

  if (parentInstance && parentInstance.access_control_list) {
    allRoleNames = _.uniq(parentInstance.access_control_list.filter(
      (acl) => {
        return acl.person.id === person.id && acl.ac_role_id in roles;
      }).map((acl) => {
      return roles[acl.ac_role_id].name;
    }));
  } else {
    let globalRole = person.system_wide_role === 'No Access'
      ? 'No Role'
      : person.system_wide_role;
    allRoleNames = [globalRole];
  }

  return options.fn({
    rolesStr: allRoleNames.join(', '),
    rolesList: allRoleNames.join('\n'),
  });
});
