/*
    Copyright (C) 2017 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {
  isAdmin,
  getPageType,
} from '../plugins/utils/current-page-utils';
import {isDashboardEnabled} from '../plugins/utils/dashboards-utils';
import {isObjectVersion} from '../plugins/utils/object-versions-utils';

import appState from '../appState';

(function (can, $) {
  can.Control('CMS.Controllers.Dashboard', {
    defaults: {
      widget_descriptors: null,
    },
  }, {
    init: function (el, options) {
      CMS.Models.DisplayPrefs.getSingleton().then(function (prefs) {
        this.display_prefs = prefs;

        this.init_tree_view_settings();
        this.init_page_title();
        this.init_page_help();
        this.init_page_header();
        this.init_widget_descriptors();
        if (!this.inner_nav_controller) {
          this.init_inner_nav();
        }
        this.update_inner_nav();

        // Before initializing widgets, hide the container to not show
        // loading state of multiple widgets before reducing to one.
        this.hide_widget_area();
        this.init_default_widgets();
        this.init_widget_area();
        this.init_info_pin();
      }.bind(this));
    },

    init_tree_view_settings: function () {
      var validModels;
      var savedChildTreeDisplayList;
      if (GGRC.pageType && GGRC.pageType === 'ADMIN') { // Admin dashboard
        return;
      }

      validModels = can.Map.keys(GGRC.tree_view.base_widgets_by_type);
    // only change the display list
      can.each(validModels, function (mName) {
        savedChildTreeDisplayList = this.display_prefs
          .getChildTreeDisplayList(mName);
        if (savedChildTreeDisplayList !== null) {
          GGRC.tree_view.sub_tree_for.attr(mName + '.display_list',
            savedChildTreeDisplayList);
        }
      }.bind(this));
    },

    init_page_title: function () {
      var pageTitle = null;
      if (typeof (this.options.page_title) === 'function') {
        pageTitle = this.options.page_title(this);
      } else if (this.options.page_title) {
        pageTitle = this.options.page_title;
      }
      if (pageTitle) {
        $('head > title').text(pageTitle);
      }
    },

    init_page_help: function () {
      var pageHelp = null;
      if (typeof (this.options.page_help) === 'function') {
        pageHelp = this.options.page_help(this);
      } else if (this.options.page_help) {
        pageHelp = this.options.page_help;
      }
      if (pageHelp) {
        this.element.find('#page-help').attr('data-help-slug', pageHelp);
      }
    },

    init_page_header: function () {
      var $pageHeader = this.element.find('#page-header');

      if (this.options.header_view && $pageHeader.length) {
        $pageHeader.html(can.view(this.options.header_view));
      }
    },

    init_widget_area: function () {
      if (!this.inner_nav_controller) {
        //  If there is no inner-nav, then ensure widgets are shown
        //  FIXME: This is a workaround because widgets and widget-areas are
        //    hidden, assuming InnerNav controller will show() them
        this.get_active_widget_containers()
          .show()
          .find('.widget').show()
          .find('> section.content').show();
      }
    },

    init_inner_nav: function () {
      var $internav = this.element.find('.internav');
      if ($internav.length) {
        this.inner_nav_controller = new CMS.Controllers.InnerNav(
          this.element.find('.internav'), {
            dashboard_controller: this,
          });
      }
    },

    init_info_pin: function () {
      this.info_pin = new CMS.Controllers
        .InfoPin(this.element.find('.pin-content'));
    },

    '.nav-logout click': function (el, ev) {
      can.Model.LocalStorage.clearAll();
    },

    init_widget_descriptors: function () {
      this.options.widget_descriptors = this.options.widget_descriptors || {};
    },

    init_default_widgets: function () {
      can.each(this.options.default_widgets, function (name) {
        var descriptor = this.options.widget_descriptors[name];
        this.add_dashboard_widget_from_descriptor(descriptor);
      }.bind(this));
    },

    hide_widget_area: function () {
      this.get_active_widget_containers().addClass('hidden');
    },
    show_widget_area: function () {
      this.get_active_widget_containers().removeClass('hidden');
    },
    ' widgets_updated': 'update_inner_nav',
    ' updateCount': function (el, ev, count, updateCount) {
      if (_.isBoolean(updateCount) && !updateCount) {
        return;
      }
      this.inner_nav_controller
        .update_widget_count($(ev.target), count, updateCount);
    },
    update_inner_nav: function (el, ev, data) {
      if (this.inner_nav_controller) {
        if (data) {
          this.inner_nav_controller
            .update_widget(data.widget || data, data.index);
        } else {
          this.inner_nav_controller.update_widget_list(
            this.get_active_widget_elements());
        }
        this.inner_nav_controller.sortWidgets();
      }
    },

    get_active_widget_containers: function () {
      return this.element.find('.widget-area');
    },

    get_active_widget_elements: function () {
      return this.element.find("section.widget[id]:not([id=''])").toArray();
    },

    add_widget_from_descriptor: function () {
      var descriptor = {};
      var that = this;
      var $element;
      var control;
      var $container;
      var $lastWidget;

      // Construct the final descriptor from one or more arguments
      can.each(arguments, function (nameOrDescriptor) {
        if (typeof (nameOrDescriptor) === 'string') {
          nameOrDescriptor =
            that.options.widget_descriptors[nameOrDescriptor];
        }
        $.extend(descriptor, nameOrDescriptor || {});
      });

      // Create widget in container?
      // return this.options.widget_container[0].add_widget(descriptor);

      if ($('#' + descriptor.controller_options.widget_id + '_widget').length > 0) {
        return;
      }

      // FIXME: This should be in some Widget superclass
      if (descriptor.controller_options.widget_guard &&
          !descriptor.controller_options.widget_guard()) {
        return;
      }

      $element = $("<section class='widget'>");
      control = new descriptor
        .controller($element, descriptor.controller_options);

      if (isAdmin()) {
        control.prepare();
      }

      // FIXME: Abstraction violation: Sortable/DashboardWidget/ResizableWidget
      //   controllers should maybe handle this?
      $container = this.get_active_widget_containers().eq(0);
      $lastWidget = $container.find('section.widget').last();

      if ($lastWidget.length > 0) {
        $lastWidget.after($element);
      } else {
        $container.append($element);
      }

      $element
        .trigger('widgets_updated', $element);

      return control;
    },

    add_dashboard_widget_from_descriptor: function (descriptor) {
      return this.add_widget_from_descriptor({
        controller: CMS.Controllers.DashboardWidgets,
        controller_options: $.extend(descriptor, {dashboard_controller: this}),
      });
    },

    add_dashboard_widget_from_name: function (name) {
      var descriptor = this.options.widget_descriptors[name];
      if (!descriptor) {
        console.debug('Unknown descriptor: ', name);
      } else {
        return this.add_dashboard_widget_from_descriptor(descriptor);
      }
    },

  });

  CMS.Controllers.Dashboard('CMS.Controllers.PageObject', {}, {
    init: function () {
      this.options.model = this.options.instance.constructor;
      this._super();
    },

    init_page_title: function () {
      // Reset title when page object is modified
      var that = this;
      var thatSuper = this._super;

      this.options.instance.bind('change', function () {
        thatSuper.apply(that);
      });
      this._super();
    },

    init_widget_descriptors: function () {
      this.options.widget_descriptors = this.options.widget_descriptors || {};
    },
  });

  can.Control('CMS.Controllers.InnerNav', {
    defaults: {
      internav_view: '/static/mustache/dashboard/internav_list.mustache',
      pin_view: '.pin-content',
      widget_list: null,
      spinners: {},
      contexts: null,
      instance: null,
      isMenuVisible: true,
      addTabTitle: 'Add Tab',
      hideTabTitle: 'Hide',
      dividedTabsMode: false,
      priorityTabs: null,
    },
  }, {
    init: function (options) {
      CMS.Models.DisplayPrefs.getSingleton().then(function (prefs) {
        const instance = GGRC.page_instance();
        this.display_prefs = prefs;
        this.options = new can.Map(this.options);
        if (!this.options.widget_list) {
          this.options.attr('widget_list', new can.Observe.List([]));
        }

        this.options.attr('instance', instance);
        if (!(this.options.contexts instanceof can.Observe)) {
          this.options.attr('contexts', new can.Observe(this.options.contexts));
        }

        appState.bind('widget', (ev, newVal)=>{
          this.route(newVal);
        });

        can.view(this.options.internav_view, this.options, function (frag) {
          const isAuditScope = instance.type === 'Audit';
          const fn = function () {
            this.element.append(frag);
            if (isAuditScope) {
              const priorityTabsNum = 4 +
                isDashboardEnabled(instance);
              this.element.addClass(this.options.instance.type.toLowerCase());
              this.options.attr('addTabTitle', 'Add Scope');
              this.options.attr('hideTabTitle', 'Show Audit Scope');
              this.options.attr('dividedTabsMode', true);
              this.options.attr('priorityTabs', priorityTabsNum);
            }
            this.route(appState.attr('widget'));
            delete this.delayed_display;
          }.bind(this);

          this.delayed_display = {
            fn: fn,
            timeout: setTimeout(fn, 50),
          };
        }.bind(this));

        this.on();
      }.bind(this));
    },

    route: function (path) {
      var widgetList = this.options.widget_list;
      var widget = this.find_widget_by_target('#' + path);
      if (!widget && widgetList.length) {
        // Target was not found, but we can select the first widget in the list
        let widgetId = widgetList[0].internav_id + '_widget';
        appState.attr('widget', widgetId);
        return;
      }
      if (widget) {
        this.set_active_widget(widget);
        return this.display_widget(widget.forceRefetch);
      }
      return new $.Deferred().resolve();
    },

    display_widget: function (refetch) {
      var activeWidgetSelector = this.options.contexts.active_widget.selector;
      var $activeWidget = $(activeWidgetSelector);
      var widgetController = $activeWidget.control();

      if (widgetController && widgetController.display) {
        return widgetController.display(refetch);
      }
      return new $.Deferred().resolve();
    },

    set_active_widget: function (widget) {
      if (typeof widget === 'string') {
        widget = this.widget_by_selector(widget);
      }

      if (widget !== this.options.contexts.attr('active_widget')) {
        widget.attr('force_show', true);
        this.update_add_more_link();
        this.options.contexts.attr('active_widget', widget);
        this.show_active_widget();
      }
    },

    show_active_widget: function (selector) {
      var panel = selector ||
        this.options.contexts.attr('active_widget').selector;
      var widget = $(panel);
      var dashboardCtr = this.options.dashboard_controller;
      var infopinCtr = dashboardCtr.info_pin.element.control();

      if (infopinCtr) {
        infopinCtr.hideInstance();
      }

      if (widget.length) {
        dashboardCtr.show_widget_area();
        widget.siblings().addClass('hidden').trigger('widget_hidden');
        widget.removeClass('hidden').trigger('widget_shown');
        this.element.find('li').removeClass('active');
        $('[href$="' + panel + '"]').closest('li').addClass('active');
      }
    },

    find_widget_by_target: function (target) {
      var i;
      var widget;
      for (i = 0; i < this.options.widget_list.length; i++) {
        widget = this.options.widget_list[i];
        if (widget.selector === target) {
          return widget;
        }
      }
    },

    widget_by_selector: function (selector) {
      return $.map(this.options.widget_list, function (widget) {
        return widget.selector === selector ? widget : undefined;
      })[0] || undefined;
    },

    /**
     * Sort widgets in place by their `order` attribute in ascending order.
     *
     * The widgets with non-existing / non-numeric `order` value are placed
     * at the end of the list.
     */
    sortWidgets: function () {
      this.options.attr('widget_list',
        _.sortByAll(this.options.widget_list, ['order', 'internav_display']));
    },

    update_widget_list: function (widgetElements) {
      var widgetList = this.options.widget_list.slice(0);
      var that = this;

      can.each(widgetElements, function (widgetElement, index) {
        widgetList.splice(
          can.inArray(
            that.update_widget(widgetElement, index)
            , widgetList)
          , 1);
      });

      can.each(widgetList, function (widget) {
        that.options.widget_list
          .splice(can.inArray(widget, that.options.widget_list), 1);
      });
    },

    update_widget: function (widgetElement, index) {
      var $widget = $(widgetElement);
      var widget = this.widget_by_selector('#' + $widget.attr('id'));
      var $header = $widget.find('.header h2');
      var icon = $header.find('i').attr('class');
      var menuItem = $header.text().trim();
      var match = menuItem ?
        menuItem.match(/\s*(\S.*?)\s*(?:\((?:(\d+)|\.*)(\/\d+)?\))?$/) : {};
      var title = match[1];
      var count = match[2] || undefined;
      var existingIndex;
      var widgetOptions;
      var widgetName;

      function getWidgetType(widgetId) {
        return isObjectVersion(widgetId) ? 'version' : '';
      }

      if (this.delayed_display) {
        clearTimeout(this.delayed_display.timeout);
        this.delayed_display.timeout = setTimeout(this.delayed_display.fn, 50);
      }

    // If the metadata is unrendered, find it via options
      if (!title) {
        widgetOptions = $widget.control('dashboard_widgets').options;
        widgetName = widgetOptions.widget_name;
        icon = icon || widgetOptions.widget_icon;
      // Strips html
        title = $('<div>')
          .html(typeof widgetName === 'function' ?
            widgetName() : (String(widgetName))).text();
      }
      title = title.replace(/^(Mapped|Linked|My)\s+/, '');

      // Only create the observable once, this gets updated elsewhere
      if (!widget) {
        widget = new can.Observe({
          selector: '#' + $widget.attr('id'),
          count: count,
          has_count: count != null,
        });
      }
      existingIndex = this.options.widget_list.indexOf(widget);

      widget.attr({
        internav_icon: icon,
        widgetType: getWidgetType(widgetOptions.widget_id),
        internav_display: title,
        internav_id: widgetOptions.widget_id,
        forceRefetch: widgetOptions && widgetOptions.forceRefetch,
        spinner: this.options.spinners['#' + $widget.attr('id')],
        model: widgetOptions && widgetOptions.model,
        order: (widgetOptions || widget).order,
        uncountable: (widgetOptions || widget).uncountable,
      });

      index = this.options.widget_list.length;

      if (existingIndex !== index) {
        if (existingIndex > -1) {
          if (index >= this.options.widget_list.length) {
            this.options.widget_list.splice(existingIndex, 1);
            this.options.widget_list.push(widget);
          } else {
            this.options.widget_list
              .splice(existingIndex, 1, this.options.widget_list[index]);
            this.options.widget_list.splice(index, 1, widget);
          }
        } else {
          this.options.widget_list.push(widget);
        }
      }

      return widget;
    },

    update_widget_count: function ($el, count) {
      var widgetId = $el.closest('.widget').attr('id');
      var widget = this.widget_by_selector('#' + widgetId);

      if (widget) {
        widget.attr({
          count: count,
          has_count: true,
        });
      }
      this.update_add_more_link();
      this.show_hide_titles();
    },

    update_add_more_link: function () {
      var hasHiddenWidgets = false;
      var $hiddenWidgets = $('.hidden-widgets-list:not(.top-space)');
      var instance = this.options.instance || {};
      var model = instance.constructor;
      var showAllTabs = false;

      if (model.obj_nav_options) {
        showAllTabs = model.obj_nav_options.show_all_tabs;
      }

      if (!this.options.isMenuVisible) {
        return;
      }

      // Update has hidden widget attr
      $.map(this.options.widget_list, function (widget) {
        var forceShowList = model.obj_nav_options.force_show_list;
        var forceShow = false;
        if (forceShowList) {
          forceShow = forceShowList.indexOf(widget.internav_display) > -1;
        }
        if (widget.has_count && widget.count === 0 &&
            !widget.force_show && !showAllTabs && !forceShow) {
          hasHiddenWidgets = true;
        }
      });
      if (hasHiddenWidgets) {
        $hiddenWidgets.find('a').show();
      } else {
        $hiddenWidgets.find('a').hide();
      }
    },

    show_hide_titles: function () {
      const pageType = getPageType();
      const originalWidgets = this.options.widget_list;
      const priorityTabsNum = this.options.attr('priorityTabs');
      const priorityTabs = originalWidgets.slice(0, priorityTabsNum);
      const notPriorityTabs = originalWidgets.slice(priorityTabsNum);

      function hideTitles(widgets) {
        widgets.forEach(function (widget) {
          widget.attr('show_title', false);
        });
      }

      function showTitles(widgets) {
        widgets.forEach(function (widget) {
          widget.attr('show_title', true);
        });
      }

      if (pageType === 'Audit') {
        showTitles(priorityTabs);
        hideTitles(notPriorityTabs);
      } else {
        showTitles(originalWidgets);
      }
    },
    '.closed click': function (el, ev) {
      var $link = el.closest('a');
      var widget = this.widget_by_selector('#' + $link.attr('href')
                                                      .split('#')[1]);
      var widgets = this.options.widget_list;

      widget.attr('force_show', false);
      this.route(widgets[0].selector); // Switch to the first widget
      return false; // Prevent the url change back to the widget we are hiding
    },

    // top nav dropdown position
    '.dropdown-toggle click': function (el, ev) {
      var $dropdown = el.closest('.hidden-widgets-list').find('.dropdown-menu');
      var $menuItem = $dropdown.find('.inner-nav-item').find('a');
      var offset = el.offset();
      var leftPos = offset.left;
      var win = $(window);
      var winWidth = win.width();

      if (winWidth - leftPos < 322) {
        $dropdown.addClass('right-pos');
      } else {
        $dropdown.removeClass('right-pos');
      }
      if ($menuItem.length === 1) {
        $dropdown.addClass('one-item');
      } else {
        $dropdown.removeClass('one-item');
      }
    },
    '.not-priority-hide click': function (el) {
      var count = this.options.attr('priorityTabs') + 1;
      var hiddenAreaSelector = 'li:nth-child(n+' + count + '):not(:last-child)';
      var $hiddenArea = this.element.find(hiddenAreaSelector);

      this.options.attr('isMenuVisible', !this.options.isMenuVisible);
      if (this.options.isMenuVisible) {
        $hiddenArea.show();
      } else {
        $hiddenArea.hide();
      }
    },
  });
})(window.can, window.can.$);
