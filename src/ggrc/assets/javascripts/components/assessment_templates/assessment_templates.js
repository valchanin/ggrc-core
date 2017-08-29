/*!
    Copyright (C) 2017 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

(function (can, GGRC) {
  'use strict';

  var QueryAPI = GGRC.Utils.QueryAPI;

  GGRC.Components('assessmentTemplates', {
    tag: 'assessment-templates',
    template: can.view(
      GGRC.mustache_path +
      '/components/assessment_templates/assessment_templates.mustache'
    ),
    viewModel: {
      responses: [],
      instance: null,
      assessmentTemplate: null,

      templates: function () {
        var result = {};
        var responses = this.attr('responses');
        var noValue = {
          title: 'No template',
          value: ''
        };
        _.each(responses, function (instance) {
          var type;

          type = instance.template_object_type;
          if (!result[type]) {
            result[type] = {
              group: type,
              subitems: []
            };
          }
          result[type].subitems.push({
            title: instance.title,
            value: instance.id + '-' + type
          });
        });
        return [noValue].concat(_.toArray(result));
      },

      /**
       * Set the initial Assessment Template to be selected in the relevant
       * dropdown menu.
       *
       * By default, the first option from the first option group is selected,
       * unless such option does not exist.
       *
       * @param {Array} templates - a list of possible options for the dropdown
       */
      _selectInitialTemplate: function (templates) {
        var WARN_EMPTY_GROUP = [
          'GGRC.Components.assessmentTemplates: ',
          'An empty template group encountered, possible API error'
        ].join('');

        var initialTemplate;
        var nonDummyItem;

        // The first element is a dummy option, thus if there are no other
        // elements, simply don't pick anything.
        if (templates.length < 2) {
          return;
        }

        nonDummyItem = templates[1];  // a single item or an object group

        if (!nonDummyItem.group) {  // a single item
          initialTemplate = nonDummyItem.value;
        } else {
          if (!nonDummyItem.subitems || nonDummyItem.subitems.length === 0) {
            console.warn(WARN_EMPTY_GROUP);
            return;  // an empty group, no option to pick from it
          }
          initialTemplate = nonDummyItem.subitems[0].value;
        }

        if (!this.attr('assessmentTemplate')) {
          this.attr('assessmentTemplate', initialTemplate);
        }
      }
    },
    init: function () {
      var viewModel = this.viewModel;
      var instance = viewModel.attr('instance');
      var param = QueryAPI.buildParam('AssessmentTemplate', {}, {
        type: instance.type,
        id: instance.id
      }, ['id', 'type', 'title', 'template_object_type']);

      QueryAPI.makeRequest({data: [param]}).then(function (response) {
        var values = response[0].AssessmentTemplate.values;

        viewModel.attr('responses', values);
        viewModel._selectInitialTemplate(viewModel.templates());
      });
    }
  });
})(window.can, window.GGRC);
