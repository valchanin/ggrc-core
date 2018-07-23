/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import DashboardWidgets from './dashboard_widgets_controller';
import InnerNav from './inner-nav-controller';
import InfoPin from './info_pin_controller';
import {
  isAdmin,
} from '../plugins/utils/current-page-utils';
import DisplayPrefs from '../models/local-storage/display-prefs';
import LocalStorage from '../models/local-storage/local-storage';

const Dashboard = can.Control({
  pluginName: 'cms_controllers_dashboard',
  defaults: {
    widget_descriptors: null,
  },
}, {
  init: function (el, options) {
    DisplayPrefs.getSingleton().then(function (prefs) {
      this.display_prefs = prefs;

      this.init_tree_view_settings();
      this.init_page_title();
      this.init_page_header();
      this.init_widget_descriptors();
      if (!this.inner_nav_controller) {
        this.init_inner_nav();
      }

      // Before initializing widgets, hide the container to not show
      // loading state of multiple widgets before reducing to one.
      this.hide_widget_area();
      this.init_default_widgets();
      this.init_widget_area();
    }.bind(this));
  },

  init_tree_view_settings: function () {
    let validModels;
    let savedChildTreeDisplayList;
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
    let pageTitle = null;
    if (typeof (this.options.page_title) === 'function') {
      pageTitle = this.options.page_title(this);
    } else if (this.options.page_title) {
      pageTitle = this.options.page_title;
    }
    if (pageTitle) {
      $('head > title').text(pageTitle);
    }
  },

  init_page_header: function () {
    let $pageHeader = this.element.find('#page-header');

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
    let $internav = this.element.find('.internav');
    if ($internav.length) {
      this.inner_nav_controller = new InnerNav(
        this.element.find('.internav'), {
          dashboard_controller: this,
        });
    }
  },

  '.nav-logout click': function (el, ev) {
    LocalStorage.clearAll();
  },

  init_widget_descriptors: function () {
    this.options.widget_descriptors = this.options.widget_descriptors || {};
  },

  init_default_widgets: function () {
    can.each(this.options.default_widgets, function (name) {
      let descriptor = this.options.widget_descriptors[name];
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
      }
      this.inner_nav_controller.sortWidgets();
    }
  },

  get_active_widget_containers: function () {
    return this.element.find('.widget-area');
  },

  add_widget_from_descriptor: function () {
    let descriptor = {};
    let that = this;
    let $element;
    let control;
    let $container;
    let $lastWidget;

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

    if ($('#' + descriptor.controller_options.widget_id).length > 0) {
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
      controller: DashboardWidgets,
      controller_options: $.extend(descriptor, {dashboard_controller: this}),
    });
  },

  add_dashboard_widget_from_name: function (name) {
    let descriptor = this.options.widget_descriptors[name];
    if (!descriptor) {
      console.debug('Unknown descriptor: ', name);
    } else {
      return this.add_dashboard_widget_from_descriptor(descriptor);
    }
  },
});

Dashboard({
  pluginName: 'cms_controllers_page_object',
}, {
  init: function () {
    this.options.model = this.options.instance.constructor;
    this._super();
    this.init_info_pin();
  },

  init_info_pin: function () {
    this.info_pin = new InfoPin(this.element.find('.pin-content'));
  },

  hideInfoPin() {
    const infopinCtr = this.info_pin.element.control();

    if (infopinCtr) {
      infopinCtr.hideInstance();
    }
  },

  init_page_title: function () {
    // Reset title when page object is modified
    let that = this;
    let thatSuper = this._super;

    this.options.instance.bind('change', function () {
      thatSuper.apply(that);
    });
    this._super();
  },

  init_widget_descriptors: function () {
    this.options.widget_descriptors = this.options.widget_descriptors || {};
  },
});
