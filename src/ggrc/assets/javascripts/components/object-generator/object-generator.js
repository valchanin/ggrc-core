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

      return new GGRC.Models.MapperModel(can.extend(data, {
        relevantTo: parentScope.attr('relevantTo'),
        callback: parentScope.attr('callback'),
        useTemplates: true,
        assessmentGenerator: true,
        isLoadingOrSaving: function () {
          return this.attr('is_saving') ||
          this.attr('block_type_change') ||
          //  disable changing of object type while loading
          //  to prevent errors while speedily selecting different types
          this.attr('is_loading');
        }
      }));
    },

    events: {
      inserted: function () {
        var self = this;
        this.scope.attr('selected').replace([]);
        this.scope.attr('entries').replace([]);

        this.setModel();

        setTimeout(function () {
          self.scope.attr('mapper').afterShown();
        });
      },
      closeModal: function () {
        this.scope.attr('is_saving', false);
        this.element.find('.modal-dismiss').trigger('click');
      },
      '.modal-footer .btn-map click': function (el, ev) {
        var callback = this.scope.attr('callback');
        var type = this.scope.attr('type');
        var object = this.scope.attr('object');
        var assessmentTemplate = this.scope.attr('assessmentTemplate');
        var instance = CMS.Models[object].findInCacheById(
          this.scope.attr('join_object_id'));

        ev.preventDefault();
        if (el.hasClass('disabled') || this.scope.attr('is_saving')) {
          return;
        }

        this.scope.attr('is_saving', true);
        return callback(this.scope.attr('selected'), {
          type: type,
          target: object,
          instance: instance,
          assessmentTemplate: assessmentTemplate,
          context: this
        });
      },
      setModel: function () {
        var type = this.scope.attr('type');

        this.scope.attr(
          'model', this.scope.mapper.modelFromType(type));
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
          return this.scope.attr('block_type_change', false);
        }

        val = val.split('-');
        type = val[1];
        this.scope.attr('block_type_change', true);
        this.scope.attr('type', type);
      }
    }
  });
})(window.can, window.can.$);
