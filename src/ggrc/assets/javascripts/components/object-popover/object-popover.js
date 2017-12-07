/*!
 Copyright (C) 2017 Google Inc., authors, and contributors
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../show-more/show-more';
import template from './object-popover.mustache';

(function (can, GGRC) {
  'use strict';

  var tag = 'object-popover';
  var defaultMaxInnerHeight = 400;
  var defaultRightPosition = 60;
  /**
   * Assessment specific mapped objects popover view component
   */
  GGRC.Components('objectPopover', {
    tag: tag,
    template: template,
    viewModel: {
      define: {
        hideTitle: {
          type: Boolean,
          value: false
        }
      },
      expanded: false,
      direction: 'left',
      maxInnerHeight: defaultMaxInnerHeight,
      openStyle: '',
      item: null,
      popoverTitleInfo: '',
      popoverTitle: 'No Title is provided',
      popoverLink: '/dashboard',
      isActive: function () {
        return this.attr('active');
      },
      setPopoverStyle: function (el, direction) {
        var pos = el[0].getBoundingClientRect();
        var top = Math.floor(el.position().top);
        var left = Math.floor(pos.width / 2);
        var width = (direction !== 'right') ?
          Math.floor(window.innerWidth - (pos.right - pos.width / 2)) :
          Math.floor(pos.width * 0.7);
        var topStyle = 'top: ' + top + 'px;';
        var leftStyle = 'left: ' + left + 'px;';
        var widthStyle = 'width: ' + width + 'px;';
        var rightStyle = 'right: ' + defaultRightPosition + 'px;';

        if (direction === 'right') {
          return topStyle + rightStyle + widthStyle;
        }
        return topStyle + leftStyle + widthStyle;
      },
      setStyle: function (el) {
        var direction = this.attr('direction');
        var style = el ? this.setPopoverStyle(el, direction) : '';
        this.attr('active', style.length);
        this.attr('openStyle', style);
        this.attr('expanded', false);
      }
    },
    events: {
      '{viewModel.item} el': function (scope, ev, el) {
        this.viewModel.setStyle(el);
      },
      '.object-popover-wrapper click': function (el, event) {
        event.stopPropagation();
      },
      '{viewModel} expanded': function (scope, ev, isExpanded) {
        // Double max height property in case additional content is expanded and visible
        var maxInnerHeight = isExpanded ?
          defaultMaxInnerHeight * 2 :
          defaultMaxInnerHeight;
        this.viewModel.attr('maxInnerHeight', maxInnerHeight);
      }
    }
  });
})(window.can, window.GGRC);
