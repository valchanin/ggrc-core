/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import '../object-list-item/business-object-list-item';
import template from './issue-unmap-item.mustache';
import Pagination from '../base-objects/pagination';
import {
  buildParam,
  batchRequests,
} from '../../plugins/utils/query-api-utils';
import {allowedToMap} from '../../plugins/ggrc_utils';
import {
  getPageInstance,
  navigate,
} from '../../plugins/utils/current-page-utils';
import * as businessModels from '../../models/business-models';

export default can.Component.extend({
  tag: 'issue-unmap-item',
  template,
  viewModel: {
    define: {
      paging: {
        value() {
          return new Pagination({pageSizeSelect: [5, 10, 15]});
        },
      },
    },
    issueInstance: {},
    target: {},
    modalTitle: 'Unmapping',
    showRelatedObjects: false,
    isLoading: false,
    relatedSnapshots: [],
    relatedAudit: {},
    total: null,
    modalState: {
      open: false,
    },
    canUnmap() {
      return allowedToMap(this.attr('issueInstance'),
        this.attr('target'), {isIssueUnmap: true});
    },

    processRelatedSnapshots() {
      this.loadRelatedObjects().done(()=> {
        if (this.attr('total')) {
          this.showModal();
        } else {
          this.unmap();
        }
      });
    },
    buildQuery(type) {
      return buildParam(
        type,
        this.attr('paging'),
        null,
        null,
        {
          expression: {
            op: {name: 'cascade_unmappable'},
            issue: {id: this.attr('issueInstance.id')},
            assessment: {id: this.attr('target.id')},
          },
        }
      );
    },
    loadRelatedObjects() {
      const snapshotsQuery = this.buildQuery('Snapshot');
      const auditsQuery = this.buildQuery('Audit');

      this.attr('isLoading', true);
      return can.when(batchRequests(snapshotsQuery), batchRequests(auditsQuery))
        .done((snapshotsResponse, auditsResponse)=> {
          const snapshots = snapshotsResponse.Snapshot;
          const audits = auditsResponse.Audit;
          this.attr('total', snapshots.total + audits.total);
          this.attr('relatedAudit', audits.values[0]);
          this.attr('relatedSnapshots', snapshots.values);
          this.attr('paging.total', snapshots.total);
        })
        .fail(()=> {
          GGRC.Errors.notifier(
            'error',
            'There was a problem with retrieving related objects.');
        })
        .always(()=> {
          this.attr('isLoading', false);
        });
    },
    showModal() {
      const total = this.attr('total');
      const title = 'Unmapping (' + total +
        (total > 1 ? ' objects' : ' object') + ')';
      this.attr('modalTitle', title);
      this.attr('modalState.open', true);
    },
    openObject(relatedObject) {
      let model;
      let type;
      let url;
      let objectType = relatedObject.type;
      let id = relatedObject.id;

      if (relatedObject.type === 'Snapshot') {
        objectType = relatedObject.child_type;
        id = relatedObject.child_id;
      }

      model = businessModels[objectType];
      type = model.root_collection;
      url = '/' + type + '/' + id;

      window.open(url, '_blank');
    },
    async unmap() {
      const currentObject = getPageInstance();
      this.attr('isLoading', true);
      try {
        const relationship = await CMS.Models.Relationship.findRelationship(
          this.attr('issueInstance'),
          this.attr('target')
        );
        await relationship.unmap(true);
        if (currentObject === this.attr('issueInstance')) {
          navigate(this.attr('issueInstance.viewLink'));
        } else {
          this.attr('modalState.open', false);
        }
      } catch (error) {
        GGRC.Errors.notifier('error', 'There was a problem with unmapping.');
      } finally {
        this.attr('isLoading', false);
      }
    },
    showNoRelationhipError() {
      const issueTitle = this.attr('issueInstance.title');
      const targetTitle = this.attr('target.title');
      const targetType = this.attr('target').class.title_singular;

      GGRC.Errors.notifier('error',
        `Unmapping cannot be performed.
        Please unmap Issue (${issueTitle})
        from ${targetType} version (${targetTitle}),
        then mapping with original object will be automatically reverted.`);
    },
  },
  events: {
    async click(el, ev) {
      ev.preventDefault();
      try {
        const relationship = await CMS.Models.Relationship.findRelationship(
          this.viewModel.attr('issueInstance'),
          this.viewModel.attr('target')
        );
        if (!relationship) {
          // if there is no relationship it mean that user try to unmap
          // original object from Issue automapped to snapshot via assessment
          this.viewModel.showNoRelationhipError();
        } else if (this.viewModel.attr('target.type') === 'Assessment' &&
          !this.viewModel.attr('issueInstance.allow_unmap_from_audit')) {
          // In this case we should show modal with related objects.
          this.viewModel.processRelatedSnapshots();
        } else {
          this.viewModel.dispatch('unmapIssue');
        }
      } catch (error) {
        GGRC.Errors.notifier('error', 'There was a problem with unmapping.');
      }
    },
    '{viewModel.paging} current'() {
      this.viewModel.loadRelatedObjects();
    },
    '{viewModel.paging} pageSize'() {
      this.viewModel.loadRelatedObjects();
    },
  },
});
