/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import './infinite-scroll-controller';
import RecentlyViewedObject from '../models/local-storage/recently-viewed-object';
import tracker from '../tracker';
import RefreshQueue from '../models/refresh_queue';
import {getPageInstance} from '../plugins/utils/current-page-utils';
import Cacheable from '../models/cacheable'

can.Control('CMS.Controllers.LHN', {
  defaults: {}
}, {
  init: function () {
    var self = this
        ;

    this.obs = new can.Observe();

    this.init_lhn();

      // Set up a scroll handler to capture the current scroll-Y position on the
      // whole LHN search panel.  scroll events do not bubble, so this cannot be
      // set as a delegate on the controller element.
    self.lhs_holder_onscroll = _.debounce(function () {
      self.options.display_prefs.setLHNState({'panel_scroll': this.scrollTop});
    }, 250);
    this.element.find('.lhs-holder').on('scroll', self.lhs_holder_onscroll);
  },
  is_lhn_open: function () {
    var _is_open = this.options.display_prefs.getLHNState().is_open;

    if (typeof _is_open === 'undefined') {
      return false;
    }

    return _is_open;
  },
  'input.widgetsearch keypress': function (el, ev) {
    var value;
    if (ev.which === 13) {
      ev.preventDefault();

      value = $(ev.target).val();
      this.do_search(value);
      this.toggle_filter_active();
    }
  },
  'submit': function (el, ev) {
    ev.preventDefault();

    var value = $(ev.target).find('input.widgetsearch').val();
    this.do_search(value);
    this.toggle_filter_active();
  },
  toggle_filter_active: function () {
      // Set active state to search field if the input is not empty:
    var $filter = this.element.find('.widgetsearch'),
      $button = this.element.find('.widgetsearch-submit'),
      $off = this.element.find('.filter-off'),
      $search_title = this.element.find('.search-title'),
      got_filter = !!$filter.val().trim().length;

    $filter.toggleClass('active', got_filter);
    $button.toggleClass('active', got_filter);
    $off.toggleClass('active', got_filter);
    $search_title.toggleClass('active', got_filter);
  },
  '.filter-off a click': function (el, ev) {
    ev.preventDefault();

    this.element.find('.widgetsearch').val('');
    this.do_search('');
    this.toggle_filter_active();
  },
  "a[data-name='work_type'] click": function (el, ev) {
    var target = $(ev.target),
      checked;

    checked = target.data('value') === 'my_work';
    this.obs.attr('my_work', checked);
      // target.closest('.btn')[checked ? 'addClass' : 'removeClass']('btn-green');
    this.options.display_prefs.setLHNState('my_work', checked);
    this.set_active_tab(checked);
  },
  toggle_lhn: function (ev) {
    ev && ev.preventDefault();
    var is_open = this.is_lhn_open();

    if (is_open) {
      this.close_lhn();
    } else {
      this.open_lhn();
    }
  },
  close_lhn: function () {
    if (this.options.display_prefs.getLHNState().is_pinned) {
      return;
    }

      // not nested
    $('.lhn-trigger').removeClass('active');

    var _width = this.options.display_prefs.getLHNavSize(null, null).lhs,
      width = _width || this.element.find('.lhs-holder').width(),
      safety = 20;

    this.element.find('.lhs-holder')
          .removeClass('active')
          .css('left', (-width - safety) + 'px');

    this.options.display_prefs.setLHNState({is_open: false});
  },
  open_lhn: function () {
    var lhsCtr = $('#lhs').control();
    this.set_active_tab();

    // not nested
    $('.lhn-trigger').removeClass('hide').addClass('active');

    this.element.find('.lhs-holder')
      .css('left', '')
      .addClass('active');

    this.options.display_prefs.setLHNState({
      is_open: true
    });
    if (lhsCtr.options._hasPendingRefresh) {
      lhsCtr.refresh_counts();
      lhsCtr.refresh_visible_lists();
    }
  },

  set_active_tab: function (newval) {
    newval || (newval = this.obs.attr('my_work'));

    var value = ['all', 'my_work'][Number(newval)];
    $("a[data-name='work_type']").removeClass('active');
    $("a[data-name='work_type'][data-value='" + value + "'").addClass('active');
    $('input.widgetsearch').attr('placeholder',
      'Filter ' + (newval ? 'my' : 'all') + ' objects...');
  },

  init_lhn: function () {
    CMS.Models.DisplayPrefs.getSingleton().done(function (prefs) {
      var $lhs = $('#lhs'),
        lhn_search_dfd,
        my_work_tab = false;

      this.options.display_prefs = prefs;

      if (typeof prefs.getLHNState().my_work !== 'undefined') {
        my_work_tab = !!prefs.getLHNState().my_work;
      }
      this.obs.attr('my_work', my_work_tab);

      lhn_search_dfd = $lhs
          .cms_controllers_lhn_search({
            observer: this.obs,
            display_prefs: prefs
          })
          .control('lhn_search')
          .display();

      $lhs.cms_controllers_lhn_tooltips();

        // Delay LHN initializations until after LHN is rendered
      lhn_search_dfd.then(function () {
        var checked = this.obs.attr('my_work'),
          value = checked ? 'my_work' : 'all',
          target = this.element.find('#lhs input.my-work[value=' + value + ']');

        target.prop('checked', true);
        target.closest('.btn')
            [checked ? 'addClass' : 'removeClass']('btn-green');

          // When first loading up, wait for the list in the open section to be loaded (if there is an open section), then
          //  scroll the LHN panel down to the saved scroll-Y position.  Scrolling the
          //  open section is handled in the LHN Search controller.

        if (this.options.display_prefs.getLHNState().open_category) {
          this.element.one('list_displayed', this.initial_scroll.bind(this));
        } else {
          this.initial_scroll();
        }

        this.toggle_filter_active();

        if (this.options.display_prefs.getLHNState().is_pinned) {
          this.pin();
        }
      }.bind(this));

      this.initial_lhn_render();
    }.bind(this));
  },

  initial_scroll: function () {
    this.element.find('.lhs-holder').scrollTop(
        this.options.display_prefs.getLHNState().panel_scroll
        || 0
    );
  },
  // this uses polling to make sure LHN is there
  // requestAnimationFrame takes browser render optimizations into account
  // it ain't pretty, but it works
  initial_lhn_render: function () {
    var self = this;
    if (!$('.lhs-holder').size() || !$('.lhn-trigger').size()) {
      window.requestAnimationFrame(this.initial_lhn_render.bind(this));
      return;
    }

    // this is ugly, but the trigger doesn't nest inside our top element
    $('.lhn-trigger').on('click', this.toggle_lhn.bind(this));
    import(/* webpackChunkName: "mousetrap" */'mousetrap')
      .then(function (Mousetrap) {
        Mousetrap.bind("alt+m", self.toggle_lhn.bind(self));
      });
    this.resize_lhn();
    this.open_lhn();
  },
  lhn_width: function () {
    return $('.lhs-holder').width() + 8;
  },
  hide_lhn: function () {
    // UI-revamp
    // Here we should hide the button ||| also
    var $area = $('.area'),
      $lhsHolder = $('.lhs-holder'),
      $bar = $('.bar-v'),
      $lhnTrigger = $('.lhn-trigger');

    this.element.hide();
    $lhsHolder.css('width', 0);
    $area.css('margin-left', 0);
    $bar.hide();
    $lhnTrigger.hide();
    $lhnTrigger.addClass('hide');

    window.resize_areas();
  },
  do_search: function (value) {
    var $search_title = this.element.find('.search-title');
    value = $.trim(value);
    if (this._value === value) {
      return;
    }
    $search_title.addClass('active');
    this.obs.attr('value', value);
    this.options.display_prefs.setLHNState('search_text', value);
    this._value = value;
  },
  mousedown: false,
  dragged: false,
  resize_lhn: function (resize, no_trigger) {
    resize || (resize = this.options.display_prefs && this.options.display_prefs.getLHNavSize(null, null).lhs);

    var max_width = window.innerWidth * .75,
      default_size = 240;

    if (resize < default_size) {
      resize = default_size;
    }
    resize = Math.min(resize, max_width);

    this.element.find('.lhs-holder').width(resize);

    if (resize) {
      this.options.display_prefs.setLHNavSize(null, 'lhs', resize);
    }

    if (!no_trigger) {
      $(window).trigger('resize');
    }
  },
  '.bar-v mousedown': function (el, ev) {
    var $target = $(ev.target);
    this.mousedown = true;
    this.dragged = false;
  },
  '{window} mousemove': function (el, ev) {
    if (!this.mousedown) {
      return;
    }

    ev.preventDefault();
    this.dragged = true;

    if (!this.element.find('.bar-v').hasClass('disabled')) {
      this.resize_lhn(ev.pageX);
    }
  },
  '{window} mouseup': function (el, ev) {
    if (!this.mousedown) return;

    this.mousedown = false;
  },
  '{window} resize': function (el, ev) {
    this.resize_lhn(null, true); // takes care of height and min/max width
  },
  '{window} mousedown': function (el, event) {
    var x = event.pageX,
      y = event.pageY;

    if (x === undefined || y === undefined) {
      return;
    }

    var on_lhn = ['.lhn-trigger:visible', '.lhs-holder:visible']
            .reduce(function (yes, selector) {
              var $selector = $(selector),
                bounds;

              if (!$selector.length) {
                return;
              }

              bounds = $selector[0].getBoundingClientRect();

              return yes
                    || x >= bounds.left
                    && x <= bounds.right
                    && y >= bounds.top
                    && y <= bounds.bottom;
            }, false);

    // #extended-info - makes sure that menu doesn't close if tooltip is open and user has clicked inside
    // We should handle this form some manager, and avoid having God object
    if (!on_lhn && this.options.display_prefs && !this.options.display_prefs.getLHNState().is_pinned &&
        !$('#extended-info').hasClass('in')) {
      this.close_lhn();
    }
  },
  destroy: function () {
    this.element.find('.lhs-holder').off('scroll', self.lhs_holder_onscroll);
    this._super && this._super.apply(this, arguments);
  },
  '.lhn-pin click': function (element, event) {
    if (this.options.display_prefs.getLHNState().is_pinned) {
      this.unpin();
    } else {
      this.pin();
    }
  },
  unpin: function () {
    this.element.find('.lhn-pin').removeClass('active');
    this.element.find('.bar-v').removeClass('disabled');
    this.options.display_prefs.setLHNState('is_pinned', false);
  },
  pin: function () {
    this.element.find('.lhn-pin').addClass('active');
    this.element.find('.bar-v').addClass('disabled');
    this.options.display_prefs.setLHNState('is_pinned', true);
  }
});

can.Control('CMS.Controllers.LHN_Search', {
  defaults: {
    list_view: GGRC.mustache_path + '/base_objects/search_result.mustache',
    actions_view: GGRC.mustache_path + '/base_objects/search_actions.mustache',
    list_selector: 'ul.top-level > li, ul.mid-level > li',
    list_toggle_selector: 'li > a.list-toggle',
    model_attr_selector: null,
    model_attr: 'data-model-name',
    model_extra_attr: 'data-model-extra',
    count_selector: '.item-count',
    list_mid_level_selector: 'ul.mid-level',
    list_content_selector: 'ul.sub-level',
    actions_content_selector: 'ul.sub-actions',
    limit: 50,
    observer: null,
    filter_params: new can.Observe(),
    counts: new can.Observe()
  }
}, {
  display: function () {
    var self = this,
      prefs = this.options.display_prefs,
      prefs_dfd,
      template_path = GGRC.mustache_path + this.element.data('template');

    prefs_dfd = CMS.Models.DisplayPrefs.getSingleton();

      // 2-way binding is set up in the view using can-value, directly connecting the
      //  search box and the display prefs to save the search value between page loads.
      //  We also listen for this value in the controller
      //  to trigger the search.
    return can.view(template_path, prefs_dfd.then(function (prefs) { return prefs.getLHNState(); })).then(function (frag, xhr) {
      var lhn_prefs = prefs.getLHNState(),
        initial_term,
        initial_params = {},
        saved_filters = prefs.getLHNState().filter_params;

      self.element.html(frag);
      self.post_init();
      self.element.find('.sub-level')
          .cms_controllers_infinite_scroll()
          .on('scroll', _.debounce(function () {
            self.options.display_prefs.setLHNState('category_scroll', this.scrollTop);
          }, 250));

      initial_term = self.options.display_prefs.getLHNState().search_text || '';
      if (self.options.observer.my_work) {
        initial_params = {'contact_id': GGRC.current_user.id};
      }
      $.map(CMS.Models, function (model, name) {
        if (model.attributes && model.attributes.default_lhn_filters) {
          self.options.filter_params.attr(model.attributes.default_lhn_filters);
        }
      });
      self.options.filter_params.attr(saved_filters);
      self.options.loaded_lists = [];
      self.run_search(initial_term, initial_params);

        // Above, category scrolling is listened on to save the scroll position.  Below, on page load the
        //  open category is toggled open, and the search placed into the search box by display prefs is
        //  sent to the search service.

      if (lhn_prefs.open_category) {
        var selector = self.options.list_selector
                  .split(',')
                  .map(function (s) {
                    return s + ' > a[data-object-singular=' + lhn_prefs.open_category + ']';
                  })
                  .join(',');

        self.toggle_list_visibility(
            self.element.find(selector)
          );
      }
    });
  },
  post_init: function () {
    var lhnCtr = $('#lhn').control();
    var refreshCounts = _.debounce(this.refresh_counts.bind(this), 1000, {
      leading: true,
      trailing: false
    });

    this.init_object_lists();
    this.init_list_views();

    Cacheable.bind('created', function (ev, instance) {
      var modelNames;
      var modelName;

      if (instance instanceof can.Model.Join) {
          // Don't refresh LHN counts when joins are created
        return;
      }
      if (!lhnCtr.is_lhn_open()) {
        this.options._hasPendingRefresh = true;
        return;
      }
      modelNames = can.map(
          this.get_visible_lists(), this.proxy('get_list_model'));
      modelName = instance.constructor.shortName;

      if (modelNames.indexOf(modelName) > -1) {
        this.options.visible_lists[modelName].unshift(instance);
        this.options.results_lists[modelName].unshift(instance);
      }
        // Refresh the counts whenever the lists change
      refreshCounts();
    }.bind(this));
  },
  '{list_toggle_selector} click': function (el, ev) {
    ev && ev.preventDefault();
    this.toggle_list_visibility(el);
  },
  ensure_parent_open: function (el) {
    var $toggle = el.parents(this.options.list_mid_level_selector).parents('li').find('a.list-toggle.top'),
      $ul = $toggle.parent('li').find(this.options.list_mid_level_selector);

    if ($toggle.size() && !$toggle.hasClass('active')) {
      this.open_list($toggle, $ul, null, true);
    }
  },
  toggle_list_visibility: function (el, dont_update_prefs) {
    var sub_selector = this.options.list_content_selector + ',' + this.options.actions_content_selector,
      mid_selector = this.options.list_mid_level_selector,
      $parent = el.parent('li'),
      selector;

    if ($parent.find(mid_selector).size()) {
      selector = mid_selector;
    } else {
      selector = sub_selector;
    }

    var $ul = $parent.find(selector);

      // Needed because the `list_selector` selector matches the Recently Viewed
      // list, which will cause errors
    if ($ul.length < 1) {
      return;
    }

    if ($ul.is(':visible')) {
      this.close_list(el, $ul, dont_update_prefs);
    } else {
      this.open_list(el, $ul, selector, dont_update_prefs);
    }
  },
  open_list: function (el, $ul, selector, dont_update_prefs) {
      // Use a cached max-height if one exists
    var holder = el.closest('.lhs-holder'),
      $content = $ul.filter([this.options.list_content_selector,
                               this.options.list_mid_level_selector].join(',')),
      $siblings = selector ? $ul.closest('.lhs').find(selector) : $(false),
      extra_height = 0,
      top;

      // Collapse other lists
    var $mids = $ul.closest('.lhs').find(this.options.list_mid_level_selector)
                    .not(el.parents(this.options.list_mid_level_selector))
                    .not(el.parent().find(this.options.list_mid_level_selector)),
      $non_children = $ul.closest('.lhs')
              .find([this.options.list_content_selector,
                     this.options.actions_content_selector].join(','))
              .filter('.in')
              .filter(function (i, el) {
                return !$.contains($ul[0], el);
              });

    [$siblings, $mids, $non_children].map(function ($selection) {
      $selection.slideUp().removeClass('in');
    });

      // Expand this list
    $ul.slideDown().addClass('in');

      // Remove active classes from others
      // remove all except current element or children
      // this works because open_list is called twice if we ensure parent is open
    var $others = $ul.closest('.lhs').find(this.options.list_selector)
              .find('a.active')
              .not(el)
              .filter(function (i, el) {
                return !$.contains($ul[0], el);
              });
    $others.removeClass('active');

      // Add active class to this list
    el.addClass('active');

      // Compute the extra height to add to the expandable height,
      // based on the size of the content that is sliding away.
    top = $content.offset().top;
    $siblings.filter(':visible').each(function () {
      var sibling_top = $(this).offset().top;
      if (sibling_top <= top) {
        extra_height += this.offsetHeight + (sibling_top < 0 ? -holder[0].scrollTop : 0);
      }
    });

      // Determine the expandable height
    this._holder_height = holder.outerHeight();
    if (!$ul.hasClass('mid-level')) {
      $content.filter(this.options.list_content_selector).css(
            'maxHeight',
            Math.max(160,
                     (this._holder_height - holder.position().top
                      + extra_height - top - 40))
        );
    }

      // Notify the display prefs that the category the user just opened is to be reopened on next page load.
    if (!dont_update_prefs) {
      this.options.display_prefs.setLHNState({'open_category': el.attr('data-object-singular')});
    }

    this.ensure_parent_open(el);
    this.on_show_list($ul);
  },
  close_list: function (el, $ul, dont_update_prefs) {
    el.removeClass('active');
    $ul.slideUp().removeClass('in');
      // on closing a category, set the display prefs to reflect that there is no open category and no scroll
        //  for the next category opened.
    if (!dont_update_prefs) {
      this.options.display_prefs.setLHNState({'open_category': null, category_scroll: 0});
    }
  },
  ' resize': function () {
    var $content = this.element.find([this.options.list_content_selector].join(',')).filter(':visible');


    if ($content.length) {
      var last_height = this._holder_height,
        holder = this.element.closest('.lhs-holder');
      this._holder_height = holder.outerHeight();


      $content.css(
            'maxHeight',
            Math.max(160,
                     (this._holder_height - last_height))
        );
    }
  },
  on_show_list: function (el, ev) {
    var $list = $(el).closest(this.get_lists()),
      model_name = this.get_list_model($list),
      that = this;
    let stopFn = tracker.start(
      `LHN: ${model_name}`,
      tracker.USER_JOURNEY_KEYS.LOADING,
      tracker.USER_ACTIONS.LHN.SHOW_LIST
    );

    setTimeout(function () {
      that.refresh_visible_lists().done(stopFn);
    }, 20);
  },
  '{observer} value': function (el, ev, newval) {
    this.run_search(newval, this.current_params);
  },
  '{observer} my_work': function (el, ev, newval) {
    this.run_search(this.current_term, newval ? {'contact_id': GGRC.current_user.id} : null);
  },
  '.sub-level scrollNext': 'show_more',
  show_more: function ($el, ev) {
    if (this._show_more_pending)
      return;

    var that = this,
      $list = $el.closest(this.get_lists()),
      model_name = this.get_list_model($list),
      visible_list = this.options.visible_lists[model_name],
      results_list = this.options.results_lists[model_name],
      refresh_queue,
      new_visible_list;
    let stopFn = tracker.start(
      `LHN: ${model_name}`,
      tracker.USER_JOURNEY_KEYS.LOADING,
      tracker.USER_ACTIONS.LHN.SHOW_MORE
    );

    if (visible_list.length >= results_list.length)
      return;

    this._show_more_pending = true;
    refresh_queue = new RefreshQueue();
    new_visible_list =
        // results_list.slice(0, visible_list.length + this.options.limit);
        results_list.slice(visible_list.length, visible_list.length + this.options.limit);

    can.each(new_visible_list, function (item) {
      refresh_queue.enqueue(item);
    });
    refresh_queue.trigger().then(function (newItems) {
      visible_list.push.apply(visible_list, newItems);
      visible_list.attr('is_loading', false);
      delete that._show_more_pending;
    }).done(stopFn);
    visible_list.attr('is_loading', true);
  },

  init_object_lists: function () {
    var self = this;
    if (!this.options.results_lists)
      this.options.results_lists = {};
    if (!this.options.visible_lists)
      this.options.visible_lists = {};

    can.each(this.get_lists(), function ($list) {
      var model_name;
      $list = $($list);
      model_name = self.get_list_model($list);
      self.options.results_lists[model_name] = new can.Observe.List();
      self.options.visible_lists[model_name] = new can.Observe.List();
      self.options.visible_lists[model_name].attr('is_loading', true);
    });
  },
  init_list_views: function () {
    var self = this;

    can.each(this.get_lists(), function ($list) {
      var model_name;
      $list = $($list);
      model_name = self.get_list_model($list);

      var context = {
        model: CMS.Models[model_name],
        filter_params: self.options.filter_params,
        list: self.options.visible_lists[model_name],
        counts: self.options.counts,
        count: can.compute(function () {
          return self.options.results_lists[model_name].attr('length');
        })
      };

      can.view($list.data('template') || self.options.list_view, context, function (frag, xhr) {
        $list.find(self.options.list_content_selector).html(frag);

          // If this category we're rendering is the one that is open, wait for the
          //  list to finish rendering in the content pane, then set the scrolltop
          //  of the category to the stored value in display prefs.
        if (model_name === self.options.display_prefs.getLHNState().open_category) {
          $list.one('list_displayed', function () {
            $(this).find(self.options.list_content_selector).scrollTop(
                self.options.display_prefs.getLHNState().category_scroll || 0
              );
          });
        }
      });
      can.view($list.data('actions') || self.options.actions_view, context, function (frag, xhr) {
        $list.find(self.options.actions_content_selector).html(frag);
      });
    });
  },
  get_list_model: function ($list, count) {
    $list = $($list);
    if (this.options.model_attr_selector)
      $list = $list.find(this.options.model_attr_selector).first();
    if (count && $list.attr('data-count')) {
      return $list.attr('data-count');
    }
    return $list.attr(this.options.model_attr);
  },
  get_extra_list_model: function ($list) {
    $list = $($list);
    if (this.options.model_attr_selector)
      $list = $list.find(this.options.model_attr_selector).first();
    if (!$list.attr(this.options.model_extra_attr)) {
      return null;
    }
    var model = $list.attr(this.options.model_attr),
      extra = $list.attr(this.options.model_extra_attr).split(',');

    extra = $.map(extra, function (e) {
      return e + '=' + model;
    }).join(',');
    return extra;
  },
  display_counts: function (search_result) {
    var self = this;

      // Remove all current counts
    self.options.counts.each(function (val, key) {
      self.options.counts.removeAttr(key);
    });
      // Set the new counts
    self.options.counts.attr(search_result.counts);

    can.each(this.get_lists(), function ($list) {
      var model_name, count;
      $list = $($list);
      model_name = self.get_list_model($list, true);
      if (model_name) {
        count = search_result.getCountFor(model_name);

          // Remove filter suffix (ie Workflow_All) from model_name before
          //  checking permissions
        model_name = model_name.split('_')[0];
        $list
            .find(self.options.count_selector)
            .text(count);
      }
    });
  },
  display_lists: function (search_result) {
    var self = this,
      lists = this.get_visible_lists(),
      dfds = [];

    can.each(lists, function (list) {
      var dfd,
        $list = $(list),
        model_name = self.get_list_model($list),
        results = search_result.getResultsForType(model_name),
        refresh_queue = new RefreshQueue(),
        initial_visible_list = null;


      self.options.results_lists[model_name].replace(results);
      initial_visible_list =
          self.options.results_lists[model_name].slice(0, self.options.limit);

        can.each(initial_visible_list, function (obj) {
          refresh_queue.enqueue(obj);
        });

      function finish_display(results) {
        can.Map.startBatch();
        self.options.visible_lists[model_name].attr('is_loading', false);
        self.options.visible_lists[model_name].replace(results);
        can.Map.stopBatch();
        setTimeout(function () {
          $list.trigger('list_displayed', model_name);
        }, 1);
      }
      dfd = refresh_queue.trigger().then(finish_display);

      dfds.push(dfd);
    });

    return $.when.apply($, dfds);
  },

  refresh_counts: function () {
    var search_id = this.search_id;
    var models;
    var extraModels;

    if (!$('.lhn-trigger').hasClass('active')) {
      this.options._hasPendingRefresh = true;
      return can.Deferred().resolve();
    }


    models = can.map(this.get_lists(), this.proxy('get_list_model'));
    extraModels = can.map(
      this.get_lists(), this.proxy('get_extra_list_model'));

    this.options._hasPendingRefresh = false;
    // Retrieve and display counts
    return GGRC.Models.Search.counts_for_types(
        this.current_term, models, this.current_params, extraModels
      ).then(function () {
        if (this.search_id === search_id) {
          return this.display_counts.apply(this, arguments);
        }
      }.bind(this));
  },

  refresh_visible_lists: function () {
    var self = this;
    var search_id = this.search_id;
    var lists = this.get_visible_lists();
    var models = can.map(lists, this.proxy('get_list_model'));

    if (!$('.lhn-trigger').hasClass('active')) {
      this.options._hasPendingRefresh = true;
      return can.Deferred().resolve();
    }

    models = can.map(models, function (model_name) {
      if (self.options.loaded_lists.indexOf(model_name) == -1)
        return model_name;
    });

    if (models.length > 0) {
      // Register that the lists are loaded
      can.each(models, function (model_name) {
        self.options.loaded_lists.push(model_name);
      });

      return GGRC.Models.Search.search_for_types(
          this.current_term, models, this.current_params
        ).then(function () {
          if (self.search_id === search_id) {
            return self.display_lists.apply(self, arguments);
          }
        });
    } else {
      return new $.Deferred().resolve();
    }
  },
  run_search: function (term, extra_params) {
    let filter_list = [];
    const contactId = extra_params && extra_params.contact_id;
    let stopFn = tracker.start(
      tracker.FOCUS_AREAS.LHN,
      tracker.USER_JOURNEY_KEYS.LOADING,
      tracker.USER_ACTIONS.LHN.SEARCH(contactId ? 'My Objects' : 'All Objects'),
    );

    if (term !== this.current_term || extra_params !== this.current_params) {
        // Clear current result lists
      can.each(this.options.results_lists, function (list) {
        list.replace([]);
      });
      can.each(this.options.visible_lists, function (list) {
        list.replace([]);
        list.attr('is_loading', true);
      });
      this.options.loaded_lists = [];

        //  `search_id` exists solely to provide a simple unique value for
        //  each search to ensure results are shown for the correct search
        //  parameters (avoiding a race condition with quick search term
        //  changes)
      this.search_id = (this.search_id || 0) + 1;
      this.current_term = term;
      this.current_params = extra_params || {};

        // Construct extra_params based on filters:
      delete this.current_params.extra_params;
      this.options.display_prefs.setLHNState('filter_params',
          this.options.filter_params);
      this.options.filter_params.each(function (obj, type) {
        var properties_list = [];
        obj.each(function (v, k) {
          properties_list.push(k + '=' + v);
        });
        if (properties_list.length) {
          filter_list.push(type + ':' + properties_list.join(','));
        }
      });
      this.current_params.extra_params = filter_list.join(';');

        // Retrieve and display results for visible lists
      return $.when(
            this.refresh_counts(),
            this.refresh_visible_lists()
          ).done(stopFn);
    }
  },
  get_lists: function () {
    return $.makeArray(
          this.element.find(this.options.list_selector));
  },
  get_visible_lists: function () {
    var self = this;
    return can.map(this.get_lists(), function ($list) {
      $list = $($list);
      if ($list.find([self.options.list_content_selector,
                        self.options.list_mid_level_selector].join(',')).hasClass('in'))
        return $list;
    });
  },

  '.filters a click': function (el, ev) {
    var term = this.options.display_prefs.getLHNState().search_text || '',
      param = {},
      key = el.data('key'),
      value = el.data('value'),
      for_model = el.parent().data('for'),
      filters = this.options.filter_params;
    if (this.options.observer.my_work) {
      param = {'contact_id': GGRC.current_user.id};
    }

    if (el.hasClass('active')) {
      filters[for_model].removeAttr(key);
      this.run_search(term, param);
      return;
    }
    if (!(for_model in filters)) {
      filters.attr(for_model, {});
    }
    filters[for_model].attr(key, value);
    this.run_search(term, param);
  }
});

can.Control('GGRC.Controllers.RecentlyViewed', {
  defaults: {
    list_view: GGRC.mustache_path + '/dashboard/recently_viewed_list.mustache',
    max_history: 10,
    max_display: 3
  }
}, {
  init: function () {
    var page_model = getPageInstance();
    var instance_list = [];
    var that = this;

    RecentlyViewedObject.findAll().done(function (objs) {
      var max_history = that.options.max_history;
      if (page_model) {
        instance_list.push(new RecentlyViewedObject(page_model));
        instance_list[0].save();
        max_history--;
      }

      for (var i = objs.length - 1; i >= 0; i--) {
        if ((page_model && page_model.viewLink === objs[i].viewLink)
            || objs.length - i > max_history || !('viewLink' in objs[i])
          ) {
          objs.splice(i, 1)[0].destroy(); // remove duplicate of current page object or excessive objects
        } else if (instance_list.length < that.options.max_display) {
          instance_list.push(objs[i]);
        }
      }

      can.view(that.options.list_view, {list: instance_list}, function (frag) {
        that.element.find('.top-level.recent').html(frag);
      });
    });
  }
});
