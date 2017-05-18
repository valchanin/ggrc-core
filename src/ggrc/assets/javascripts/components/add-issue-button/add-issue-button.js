/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, GGRC, CMS) {
  'use strict';
  var CurrentPageUtils = GGRC.Utils.CurrentPage;

  GGRC.Components('addIssueButton', {
    tag: 'add-issue-button',
    template: can.view(
      GGRC.mustache_path +
      '/components/add-issue-button/add-issue-button.mustache'
    ),
    viewModel: {
      define: {},
      relatedInstance: {},
      snapshots: [],
      prepareJSON: function () {
        var instance = this.attr('relatedInstance');
        var audit = instance.attr('audit');
        var json;
        var relatedSnapshots = this.attr('snapshots').attr() || [];

        relatedSnapshots = relatedSnapshots.map(function (item) {
          return {
            title: item.title,
            id: item.id,
            type: item.type,
            context: item.context
          };
        });
        json = {
          audit: {title: audit.title, id: audit.id, type: audit.type},
          relatedSnapshots: relatedSnapshots,
          context: {type: audit.context.type, id: audit.context.id},
          assessment: {
            title: instance.title,
            id: instance.id,
            type: instance.type,
            title_singular: instance.class.title_singular,
            table_singular: instance.class.table_singular
          }
        };

        return JSON.stringify(json);
      }
    },
    events: {
      '{window} modal:success': function (window, event, instance) {
        var pageInstance;

        if (instance instanceof CMS.Models.Issue) {
          pageInstance = GGRC.page_instance();
          CurrentPageUtils.initCounts(
            ['Issue'],
            pageInstance.type,
            pageInstance.id
          );
        }

        this.viewModel.attr('relatedInstance').dispatch('refreshInstance');
      }
    }
  });
})(window.can, window.GGRC, window.CMS);
