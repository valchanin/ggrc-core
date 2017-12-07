/*!
 Copyright (C) 2017 Google Inc., authors, and contributors
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../related-objects/related-people-access-control';
import '../related-objects/related-people-access-control-group';
import '../people/deletable-people-group';
import {
  getParentUrl,
} from '../../plugins/utils/snapshot-utils';
import '../custom-attributes/custom-attributes-field-view';
import '../related-objects/related-people-access-control';
import template from './detailed-business-object-list-item.mustache';

(function (can, GGRC) {
  'use strict';

  var tag = 'detailed-business-object-list-item';
  /**
   * Assessment specific mapped objects popover view component
   */
  GGRC.Components('detailedBusinessObjectListItem', {
    tag: tag,
    template: template,
    viewModel: {
      instance: {},
      customAttributes: null,
      adminRole: ['Admin'],
      deletableAdmin: false,
      define: {
        isSnapshot: {
          get: function () {
            return this.attr('instance.type') === 'Snapshot';
          }
        },
        itemData: {
          get: function () {
            return this.attr('isSnapshot') ?
              this.attr('instance.revision.content') :
              this.attr('instance');
          }
        },
        objectLink: {
          get: function () {
            return this.attr('isSnapshot') ?
              getParentUrl(this.attr('instance')) :
              this.attr('itemData.viewLink');
          }
        },
        objectTitle: {
          get: function () {
            return this.attr('itemData.title') ||
              this.attr('itemData.description_inline') ||
              this.attr('itemData.name') ||
              this.attr('itemData.email') || false;
          }
        }
      }
    }
  });
})(window.can, window.GGRC);
