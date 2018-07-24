/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import SystemOrProcess from './system-or-process';
import {hasQuestions} from '../../plugins/utils/ggrcq-utils';

export default SystemOrProcess('CMS.Models.System', {
  root_object: 'system',
  root_collection: 'systems',
  findAll: 'GET /api/systems',
  findOne: 'GET /api/systems/{id}',
  create: 'POST /api/systems',
  update: 'PUT /api/systems/{id}',
  destroy: 'DELETE /api/systems/{id}',
  cache: can.getObject('cache', SystemOrProcess, true),
  is_custom_attributable: true,
  isRoleable: true,
  attributes: {},
  defaults: {
    title: '',
    url: '',
    status: 'Draft',
  },
  sub_tree_view_options: {
    default_filter: ['Product'],
  },
  statuses: ['Draft', 'Deprecated', 'Active'],
  init: function () {
    can.extend(this.attributes, SystemOrProcess.attributes);
    this._super && this._super(...arguments);
    this.tree_view_options = $.extend(true, {},
      SystemOrProcess.tree_view_options);

    if (hasQuestions(this.shortName)) {
      this.tree_view_options.attr_list.push({
        attr_title: 'Questionnaire',
        attr_name: 'questionnaire',
        disable_sorting: true,
      });
    }
    this.validateNonBlank('title');
  },
}, {
  init: function () {
    this._super && this._super(...arguments);
    this.attr('is_biz_process', false);
  },
});
