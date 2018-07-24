/*
  Copyright (C) 2018 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import '../person/person-data';
import '../review-link/review-link';
import {REFRESH_APPROVAL} from '../../events/eventTypes';

import {
  buildParam,
  batchRequests,
} from '../../plugins/utils/query-api-utils';
import {getRole} from '../../plugins/utils/acl-utils';
import Permission from '../../permission';
import * as businessModels from '../../models/business-models';

import template from './approval-link.mustache';

export default can.Component.extend({
  tag: 'approval-link',
  template,
  viewModel: {
    define: {
      isReviewer: {
        get() {
          let assigneeRole = getRole(
            'CycleTaskGroupObjectTask',
            'Task Assignees');
          let currentUserId = GGRC.current_user.id;
          let reviewTask = this.attr('reviewTask');

          let isReviewer = reviewTask &&
              (_.some(reviewTask.access_control_list, function (acl) {
                return acl.ac_role_id === assigneeRole.id &&
                  acl.person &&
                  acl.person.id === currentUserId;
              }) ||
              Permission.is_allowed('__GGRC_ADMIN__'));

          return !!isReviewer;
        },
      },
    },
    instance: null,
    reviewTask: null,
    isInitializing: true,
    loadReviewTask() {
      let instance = this.attr('instance');

      let type = 'CycleTaskGroupObjectTask';
      let pagingInfo = {
        current: 1,
        pageSize: 1,
      };
      let relevant = {
        id: instance.attr('id'),
        type: instance.attr('type'),
      };
      let filter = {
        expression: {
          left: 'object_approval',
          op: {name: '='},
          right: 'true',
        },
      };

      this.attr('isInitializing', true);
      batchRequests(buildParam(type, pagingInfo, relevant, null, filter))
        .then((result)=> {
          let values = result[type].values.map((value) => {
            return new businessModels[type](value);
          });
          this.attr('reviewTask', values[0]);
          this.attr('isInitializing', false);
        });
    },
  },
  events: {
    inserted() {
      this.viewModel.loadReviewTask();
    },
    [`{viewModel.instance} ${REFRESH_APPROVAL.type}`]() {
      this.viewModel.loadReviewTask();
    },
  },
});
