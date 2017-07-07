/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, $) {
  'use strict';

  /**
   * A component implementing a modal for mapping objects to other objects,
   * taking the object type mapping constraints into account.
   */
  GGRC.Components('objectGenerator', {
    tag: 'object-generator',
    template: can.view(GGRC.mustache_path +
      '/components/object-generator/object-generator.mustache'),
    scope: function (attrs, parentScope) {
      var data = {
        object: attrs.object,
        join_object_id: attrs.joinObjectId,
        type: attrs.type
      };

      return {
        isLoadingOrSaving: function () {
          return this.attr('mapper.is_saving') ||
          this.attr('mapper.block_type_change') ||
          //  disable changing of object type while loading
          //  to prevent errors while speedily selecting different types
          this.attr('mapper.is_loading');
        },
        mapper: new GGRC.Models.MapperModel(can.extend(data, {
          relevantTo: parentScope.attr('relevantTo'),
          callback: parentScope.attr('callback'),
          useTemplates: true,
          assessmentGenerator: true
        }))
      };
    },

    events: {
      inserted: function () {
        var self = this;
        this.scope.attr('mapper.selected').replace([]);
        this.scope.attr('mapper.entries').replace([]);

        this.setModel();

        setTimeout(function () {
          self.scope.attr('mapper').afterShown();
        });
      },
      closeModal: function () {
        this.scope.attr('mapper.is_saving', false);
        this.element.find('.modal-dismiss').trigger('click');
      },
      '.modal-footer .btn-map click': function (el, ev) {
        var callback = this.scope.attr('mapper.callback');
        var type = this.scope.attr('mapper.type');
        var object = this.scope.attr('mapper.object');
        var assessmentTemplate = this.scope.attr('mapper.assessmentTemplate');
        var instance = CMS.Models[object].findInCacheById(
          this.scope.attr('mapper.join_object_id'));

        ev.preventDefault();
        if (el.hasClass('disabled') || this.scope.attr('mapper.is_saving')) {
          return;
        }

        this.scope.attr('mapper.is_saving', true);
        return callback(this.scope.attr('mapper.selected'), {
          type: type,
          target: object,
          instance: instance,
          assessmentTemplate: assessmentTemplate,
          context: this
        });
      },
      setModel: function () {
        var type = this.scope.attr('mapper.type');

        this.scope.attr(
          'mapper.model', this.scope.mapper.modelFromType(type));
      },
      '{mapper} type': function () {
        var mapper = this.scope.attr('mapper');
        mapper.attr('filter', '');
        mapper.attr('afterSearch', false);

        this.setModel();

        setTimeout(mapper.onSubmit.bind(mapper));
      },
      '{mapper} assessmentTemplate': function (scope, ev, val, oldVal) {
        var type;
        if (_.isEmpty(val)) {
          return this.scope.attr('mapper.block_type_change', false);
        }

        val = val.split('-');
        type = val[1];
        this.scope.attr('mapper.block_type_change', true);
        this.scope.attr('mapper.type', type);
      }
    }
  });
})(window.can, window.can.$);
