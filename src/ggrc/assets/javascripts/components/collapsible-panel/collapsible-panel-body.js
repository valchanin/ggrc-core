/*!
 Copyright (C) 2017 Google Inc., authors, and contributors
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, GGRC) {
  'use strict';

  var tag = 'collapsible-panel-body';
  var tpl = can.view(GGRC.mustache_path +
    '/components/collapsible-panel/collapsible-panel-body.mustache');
  /**
   * Collapsible Panel component to add collapsing behavior
   */
  GGRC.Components('collapsiblePanelBody', {
    tag: tag,
    template: tpl,
    scope: {
      renderContent: function () {
        return this.attr('softMode') || this.attr('expanded');
      },
      softMode: false,
      expanded: null
    }
  });
})(window.can, window.GGRC);
