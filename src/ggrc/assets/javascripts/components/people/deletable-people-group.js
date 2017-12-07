/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../object-list-item/person-list-item';
import viewModel from '../view-models/people-group-vm';
import template from './deletable-people-group.mustache';

export default GGRC.Components('deletablePeopleGroup', {
  tag: 'deletable-people-group',
  template: template,
  viewModel,
});
