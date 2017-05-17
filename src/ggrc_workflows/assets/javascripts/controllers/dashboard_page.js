/*!
    Copyright (C) 2017 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

;(function (CMS, GGRC, can, $) {
  can.Component.extend({
    tag: "dashboard-widgets",
    template: "<content/>",
    scope: {
      initial_wf_size: 5,
      workflow_view: GGRC.mustache_path + "/dashboard/info/workflow_progress.mustache",
      workflow_data: {},
      workflow_count: 0,
      workflow_show_all: false
    },
    events: {
      // Click action to show all workflows
      "a.workflow-trigger.show-all click" : function(el, ev) {
        this.scope.workflow_data.attr('list', this.scope.workflow_data.cur_wfs);

        el.text('Show top 5 workflows');
        el.removeClass('show-all');
        el.addClass('show-5');

        ev.stopPropagation();
      },
      //Show onlt top 5 workflows
      "a.workflow-trigger.show-5 click" : function(el, ev) {
        this.scope.workflow_data.attr('list', this.scope.workflow_data.cur_wfs5);

        el.text('Show all my workflows');
        el.removeClass('show-5');
        el.addClass('show-all');

        ev.stopPropagation();
      },

      // Show Workflows
      "li.workflow-tab click" : function(el, ev) {
        el.addClass('active');
        this.element.find('.workflow-wrap-main').show();
        ev.stopPropagation();
      }
    },
    init: function() {
      this.init_my_workflows();
    },
    init_my_workflows: function() {
      var self = this,
          my_view = this.scope.workflow_view,
          workflow_data = {},
          wfs,              // list of all workflows
          cur_wfs,          // list of workflows with current cycles
          cur_wfs5;         // list of top 5 workflows with current cycle

      if (!GGRC.current_user) {
        return;
      }

      GGRC.Models.Search.search_for_types('', ['Workflow'], {contact_id: GGRC.current_user.id})
      .then(function(result_set){
          var wf_data = result_set.getResultsForType('Workflow');
          var refresh_queue = new RefreshQueue();
          refresh_queue.enqueue(wf_data);
          return refresh_queue.trigger();
      }).then(function(options){
          wfs = options;

          return $.when.apply($, can.map(options, function(wf){
            return self.update_tasks_for_workflow(wf);
          }));
      }).then(function(){
        if(wfs.length > 0){
          //Filter workflows with a current cycle
          cur_wfs = self.filter_current_workflows(wfs);
          self.scope.attr('workflow_count', cur_wfs.length);
          //Sort the workflows in ascending order by first_end_date
          cur_wfs.sort(self.sort_by_end_date);
          workflow_data.cur_wfs = cur_wfs;

          if (cur_wfs.length > self.scope.initial_wf_size) {
            cur_wfs5 = cur_wfs.slice(0, self.scope.initial_wf_size);
            self.scope.attr('workflow_show_all', true);
          } else {
            cur_wfs5 = cur_wfs;
            self.scope.attr('workflow_show_all', false);
          }

          workflow_data.cur_wfs5 = cur_wfs5;
          workflow_data.list = cur_wfs5;
          self.scope.attr('workflow_data', workflow_data);
        }
      });

      return 0;
    },
    update_tasks_for_workflow: function(workflow){
      var self = this,
          dfd = $.Deferred(),
          task_count = 0,
          finished = 0,
          in_progress = 0,
          declined = 0,
          verified = 0,
          assigned = 0,
          over_due = 0,
          today = new Date(),
          first_end_date,
          task_data = {};

        workflow.get_binding('current_all_tasks').refresh_instances().then(function(d){
          var mydata = d;
          task_count = mydata.length;
          for(var i = 0; i < task_count; i++){
            var data = mydata[i].instance,
                end_date = new Date(data.end_date || null);

            //Calculate first_end_date for the workflow / earliest end for all the tasks in a workflow
            if (i === 0)
              first_end_date = end_date;
            else if (end_date.getTime() < first_end_date.getTime())
              first_end_date = end_date;

            //Any task not verified is subject to overdue
            if (data.status === 'Verified')
              verified++;
            else {
              // TODO: [Overdue] Move this logic to helper.
              if (end_date.getTime() < today.getTime()) {
                over_due++;
                $('dashboard-errors').control().scope.attr('error_msg', 'Some tasks are overdue!');
              }
              else if (data.status === 'Finished')
                finished++;
              else if (data.status === 'InProgress')
                in_progress++;
              else if (data.status === 'Declined')
                declined++;
              else
                assigned++;
            }
          }
          //Update Task_data object for workflow and Calculate %
          if (task_count > 0) {
            task_data.task_count = task_count;
            task_data.finished = finished;
            task_data.finished_percentage = ((finished * 100) / task_count).toFixed(2); //precision up to 2 decimal points
            task_data.in_progress = in_progress;
            task_data.in_progress_percentage = ((in_progress * 100) / task_count).toFixed(2);
            task_data.verified = verified;
            task_data.verified_percentage = ((verified * 100) / task_count).toFixed(2);
            task_data.declined = declined;
            task_data.declined_percentage = ((declined * 100) / task_count).toFixed(2);
            task_data.over_due = over_due;
            task_data.over_due_percentage = ((over_due * 100) / task_count).toFixed(2);
            task_data.assigned = assigned;
            task_data.assigned_percentage = ((assigned * 100) / task_count).toFixed(2);
            task_data.first_end_dateD = first_end_date;
            task_data.first_end_date = first_end_date.toLocaleDateString();
            //calculate days left for first_end_date
            if(today.getTime() >= first_end_date.getTime())
              task_data.days_left_for_first_task = 0;
            else {
              var time_interval = first_end_date.getTime() - today.getTime();
              var day_in_milli_secs = 24 * 60 * 60 * 1000;
              task_data.days_left_for_first_task = Math.floor(time_interval/day_in_milli_secs);
            }

            //set overdue flag
            task_data.over_due_flag = over_due ? true : false;
          }

          workflow.attr('task_data', new can.Map(task_data));
          dfd.resolve();
        });

        return dfd;
    },
    /*
      filter_current_workflows filters the workflows with current tasks in a
      new array and returns the new array.
      filter_current_workflows should be called after update_tasks_for_workflow.
      It looks at the task_data.task_count for each workflow
      For workflow with current tasks, task_data.task_count must be > 0;
    */
    filter_current_workflows: function(workflows){
      var filtered_wfs = [];

      can.each(workflows, function(item){
        if (item.task_data) {
          if (item.task_data.task_count > 0)
            filtered_wfs.push(item);
        }
      });
      return filtered_wfs;
    },
    /*
      sort_by_end_date sorts workflows in assending order with respect to task_data.first_end_date
      This should be called with workflows with current tasks.
    */
    sort_by_end_date: function(a, b) {
        return (a.task_data.first_end_dateD.getTime() - b.task_data.first_end_dateD.getTime());
    }

  });

  can.Component.extend({
    tag: "dashboard-errors",
    template: "<content/>",
    scope: {
      error_msg: '',
    }
  });

})(this.CMS, this.GGRC, this.can, this.can.$);
