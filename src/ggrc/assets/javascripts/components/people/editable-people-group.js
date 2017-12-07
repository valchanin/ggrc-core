/*
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import './people-group-modal';
import './editable-people-group-header';
import '../autocomplete/autocomplete';
import '../external-data-autocomplete/external-data-autocomplete';
import '../object-list-item/person-list-item';
import peopleGroupVM from '../view-models/people-group-vm';
import template from './editable-people-group.mustache';

const SHOW_MODAL_LIMIT = 4;

var viewModel = peopleGroupVM.extend({
  title: '@',
  canEdit: {},
  showPeopleGroupModal: false,
  updatableGroupId: null,
  define: {
    editableMode: {
      set: function (newValue, setValue) {
        this.attr('showPeopleGroupModal',
          this.attr('people.length') > SHOW_MODAL_LIMIT);
        setValue(newValue);
      },
    },
    showSeeMoreLink: {
      get: function () {
        return !this.attr('editableMode') &&
          !this.attr('isReadonly') &&
          this.attr('people.length') > SHOW_MODAL_LIMIT;
      },
    },
    /**
     * Contains people list which is displayed when editableMode is off
     * @type {can.List}
     */
    showPeople: {
      get: function () {
        if (this.attr('showPeopleGroupModal') && !this.attr('isReadonly')) {
          return this.attr('people').attr().slice(0, SHOW_MODAL_LIMIT);
        }

        return this.attr('people').attr();
      },
    },
    /**
     * Indicates whether people group is readonly
     * canEdit becomes false while people group is saving
     * (updatableGroupId is not null in this case)
     * @type {boolean}
     */
    isReadonly: {
      type: 'boolean',
      get() {
        return !(this.attr('canEdit') || this.attr('updatableGroupId'));
      },
    },
  },
  personSelected: function (person) {
    this.dispatch({
      type: 'personSelected',
      person: person,
      groupId: this.attr('groupId'),
    });
  },
  save: function () {
    this.dispatch('saveChanges');
  },
  cancel: function () {
    this.changeEditableMode(false);
  },
  changeEditableMode: function (editableMode) {
    this.attr('editableMode', editableMode);
    this.dispatch({
      type: 'changeEditableMode',
      editableMode: editableMode,
      groupId: this.attr('groupId'),
    });
  },
});

export default GGRC.Components('editablePeopleGroup', {
  tag: 'editable-people-group',
  template: template,
  viewModel: viewModel,
  events: {
    '{window} mousedown': function (el, ev) {
      var viewModel = this.viewModel;
      var isInside = GGRC.Utils.events.isInnerClick(this.element, ev.target);
      var editableMode = viewModel.attr('editableMode');

      if (!isInside && editableMode) {
        viewModel.save();
      }
    },
  },
});
