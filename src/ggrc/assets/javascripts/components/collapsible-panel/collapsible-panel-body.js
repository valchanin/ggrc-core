/*!
 Copyright (C) 2017 Google Inc., authors, and contributors
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './collapsible-panel-body.mustache';

(function (can, GGRC) {
  'use strict';

  var tag = 'collapsible-panel-body';
  /**
   * Collapsible Panel component to add collapsing behavior
   */
  GGRC.Components('collapsiblePanelBody', {
    tag: tag,
    template: template,
    scope: {
      renderContent: function () {
        return this.attr('softMode') || this.attr('expanded');
      },
      softMode: false,
      expanded: null
    }
  });
})(window.can, window.GGRC);
