/*!
 Copyright (C) 2017 Google Inc., authors, and contributors
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './read-more.mustache';

(function (can, GGRC) {
  'use strict';

  var tag = 'read-more';
  var readMore = 'Read More';
  var readLess = 'Read Less';
  var classPrefix = 'ellipsis-truncation-';
  /**
   * Assessment specific read more view component
   */
  GGRC.Components('readMore', {
    tag: tag,
    template: template,
    viewModel: {
      define: {
        text: {
          type: 'string',
          value: ''
        },
        maxLinesNumber: {
          type: 'number',
          value: 5
        },
        cssClass: {
          type: 'string',
          value: '',
          get: function () {
            return this.attr('expanded') ? '' :
              classPrefix + this.attr('maxLinesNumber');
          }
        }
      },
      expanded: false,
      overflowing: false,
      lineHeight: null,
      btnText: function () {
        return this.attr('expanded') ? readLess : readMore;
      },
      toggle: function (ev) {
        ev.stopPropagation();
        this.attr('expanded', !this.attr('expanded'));
      },
      isOverflowing: function (element) {
        var result;
        var clientHeight = element.clientHeight;
        var scrollHeight = element.scrollHeight;

        if (!this.attr('expanded')) {
          result = scrollHeight > clientHeight;
        } else {
          result = clientHeight >=
            (this.attr('lineHeight') * this.attr('maxLinesNumber'));
        }
        this.attr('overflowing', result);
      },
      checkOverflowing: function (el) {
        var $element = $(el).find('.read-more__body');
        var element = $element[0];

        this.attr('lineHeight',
          parseInt($element.css('line-height'), 10));

        if (element) {
          this.isOverflowing(element);
        }
      }
    },
    events: {
      '{element} mouseover': function () {
        this.viewModel.checkOverflowing(this.element);
      }
    }
  });
})(window.can, window.GGRC);
