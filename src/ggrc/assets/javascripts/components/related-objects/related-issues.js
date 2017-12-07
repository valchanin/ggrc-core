/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import './related-objects';
import '../add-issue-button/add-issue-button';
import template from './related-issues.mustache';

(function (can, GGRC) {
  'use strict';

  GGRC.Components('relatedIssues', {
    tag: 'related-issues',
    template: template,
    viewModel: {
      define: {
        orderBy: {
          type: 'string',
          value: 'created_at'
        },
        allRelatedSnapshots: {
          Value: can.List
        },
        itemsType: {
          type: 'string',
          value: 'Issue'
        },
        relatedIssuesFilter: {
          type: '*',
          get: function () {
            var id = this.attr('baseInstance.id');
            var type = this.attr('baseInstance.type');
            return {
              expression: {
                left: {
                  object_name: type,
                  op: {name: 'relevant'},
                  ids: [id]
                },
                right: {
                  object_name: type,
                  op: {name: 'similar'},
                  ids: [id]
                },
                op: {name: 'OR'}
              }
            };
          }
        }
      },
      baseInstance: null
    }
  });
})(window.can, window.GGRC);
