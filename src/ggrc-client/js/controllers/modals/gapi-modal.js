/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import ModalsController from './modals_controller';

export default ModalsController({
  pluginName: 'ggrc_controllers_gapi_modal',
  defaults: {
    skip_refresh: true,
    content_view: GGRC.mustache_path + '/gdrive/auth_button.mustache',
  },
  init: function () {
    this._super.apply(this, arguments);
    this.defaults.button_view = can.view.mustache('');
  },
}, {
  init: function () {
    this._super();
    this.element.trigger('shown');
  },
  '{scopes} change': function () {
    this.element.trigger('shown');
  },
  '{$content} a.btn[data-toggle=gapi]:not(.disabled) click': function (el) {
    el.addClass('disabled');
    this.options.onAccept().always(()=> {
      this.element.modal_form('hide');
    });
  },
  ' hide': function () {
    this.options.onDecline();
    this.element && this.element.remove();
  },
});
