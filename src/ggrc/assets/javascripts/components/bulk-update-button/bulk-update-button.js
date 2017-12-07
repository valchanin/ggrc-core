/*
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './bulk-update-button.mustache';
import updateService from '../../plugins/utils/bulk-update-service';

export default can.Component.extend({
  tag: 'bulk-update-button',
  template: template,
  viewModel: {
    model: null,
    openBulkUpdateModal: function (el, type) {
      import(/*webpackChunkName: "mapper"*/ '../../controllers/mapper/mapper')
        .then(mapper => {
          mapper.ObjectBulkUpdate.launch(el, {
            object: type,
            type: type,
            callback: this.updateObjects.bind(this, el),
          });
        });
    },
    updateObjects: function (el, context, args) {
      var model = this.attr('model');
      var nameSingular = model.name_singular;
      var progressMessage =
        `${nameSingular} update is in progress. This may take several minutes.`;

      context.closeModal();
      GGRC.Errors.notifier('progress', progressMessage);
      updateService.update(model, args.selected, args.options)
        .then(function (res) {
          var updated = _.filter(res, {status: 'updated'});
          var updatedCount = updated.length;
          var message = this.getResultNotification(model, updatedCount);

          GGRC.Errors.notifier('info', message);

          if (updatedCount > 0) {
            can.trigger(el.closest('tree-widget-container'), 'refreshTree');
          }
        }.bind(this));
    },
    getResultNotification: function (model, updatedCount) {
      var nameSingularLowerCase = model.name_singular.toLowerCase();
      var namePlural = model.name_plural;
      var namePluralLowerCase = namePlural.toLowerCase();

      if (updatedCount === 0) {
        return `No ${namePluralLowerCase} were updated.`;
      }

      return `${updatedCount} ` + (updatedCount === 1 ?
        `${nameSingularLowerCase} was ` :
        `${namePluralLowerCase} were `) +
        'updated successfully.';
    },
  },
  events: {
    'a click': function (el) {
      var model = this.viewModel.attr('model');
      var type = model.model_singular;

      this.viewModel.openBulkUpdateModal(el, type);
    },
  },
});
