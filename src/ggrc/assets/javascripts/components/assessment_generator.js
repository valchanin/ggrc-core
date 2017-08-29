/*!
    Copyright (C) 2017 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

(function (_, can, $, GGRC, CMS) {
  'use strict';

  GGRC.Components('assessmentGeneratorButton', {
    tag: 'assessment-generator-button',
    template: '{{{> /static/mustache/base_objects/' +
    'generate_assessments_button.mustache}}}',
    scope: {
      audit: null,
      button: '@'
    },
    events: {
      'a click': function (el, ev) {
        var instance = this.scope.attr('audit') || GGRC.page_instance();
        this._results = null;
        GGRC.Controllers.ObjectGenerator.launch(el, {
          object: 'Audit',
          type: 'Control',
          'join-object-id': instance.id,
          'join-mapping': 'program_controls',
          relevantTo: [{
            readOnly: true,
            type: instance.type,
            id: instance.id,
            title: instance.title
          }],
          callback: this.generateAssessments.bind(this)
        });
      },
      showFlash: function (statuses) {
        var flash = {};
        var type;
        var redirectLink;
        var messages = {
          error: 'Assessment generation has failed.',
          progress: 'Assessment generation is in progress. This may take ' +
          'several minutes.',
          success: 'Assessment was generated successfully. {reload_link}'
        };
        if (statuses.Failure > 0) {
          type = 'error';
        } else if (statuses.Pending > 0 || statuses.Running > 0) {
          type = 'progress';
        } else {
          type = 'success';
          redirectLink = window.location.pathname + '#assessment_widget';
        }

        flash[type] = messages[type];
        $('body').trigger('ajax:flash', [flash, redirectLink]);
      },
      updateStatus: function (ids, count) {
        var wait = [2, 4, 8, 16, 32, 64];
        if (count >= wait.length) {
          count = wait.length - 1;
        }
        CMS.Models.BackgroundTask.findAll({
          id__in: ids.join(',')
        }).then(function (tasks) {
          var statuses = _.countBy(tasks, function (task) {
            return task.status;
          });
          this.showFlash(statuses);
          if (statuses.Pending || statuses.Running) {
            setTimeout(function () {
              this.updateStatus(ids, ++count);
            }.bind(this), wait[count] * 1000);
          }
        }.bind(this));
      },
      generateAssessments: function (list, options) {
        var que = new RefreshQueue();

        this._results = null;
        que.enqueue(list).trigger().then(function (items) {
          var results = _.map(items, function (item) {
            var id = options.assessmentTemplate.split('-')[0];
            return this.generateModel(item, id, options.type);
          }.bind(this));
          this._results = results;
          $.when.apply($, results)
            .then(function () {
              var tasks = arguments;
              var ids;
              this.showFlash({Pending: 1});
              options.context.closeModal();
              if (!tasks.length || tasks[0] instanceof CMS.Models.Assessment) {
                // We did not create a task
                window.location.reload();
                return;
              }
              ids = _.uniq(_.map(arguments, function (task) {
                return task.id;
              }));
              this.updateStatus(ids, 0);
            }.bind(this));
        }.bind(this));
      },
      generateModel: function (object, template, type) {
        var title = 'Generated Assessment for ' + this.scope.audit.title;
        var data = {
          _generated: true,
          audit: this.scope.audit,
          // Provide actual Snapshot Object for Assessment
          object: {
            id: object.id,
            type: 'Snapshot',
            href: object.selfLink
          },
          context: this.scope.audit.context,
          title: title,
          assessment_type: type
        };
        data.run_in_background = true;

        if (template) {
          data.template = {
            id: Number(template),
            type: 'AssessmentTemplate'
          };
        }
        return new CMS.Models.Assessment(data).save();
      },
      notify: function () {
        var success;
        var errors;
        var msg;

        if (!this._results) {
          return;
        }
        success = _.filter(this._results, function (assessment) {
          return !_.isNull(assessment) &&
            !(assessment.state && assessment.state() === 'rejected');
        }).length;
        errors = _.filter(this._results, function (assessment) {
          return assessment.state && assessment.state() === 'rejected';
        }).length;

        if (errors < 1) {
          if (success === 0) {
            msg = {
              success: 'Every Control already has an Assessment!'
            };
          } else {
            msg = {
              success: success + ' Assessments successfully created.'
            };
          }
        } else {
          msg = {
            error: 'An error occurred when creating Assessments.'
          };
        }

        $(document.body).trigger('ajax:flash', msg);
      }
    }
  });
})(window._, window.can, window.can.$, window.GGRC, window.CMS);
