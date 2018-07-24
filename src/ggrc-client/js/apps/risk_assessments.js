/*
 * Copyright (C) 2018 Google Inc.
 * Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import {
  Proxy,
  Direct,
  Multi,
  TypeFilter,
} from '../models/mappers/mapper-helpers';
import Mappings from '../models/mappers/mappings';
import {getPageInstance} from '../plugins/utils/current-page-utils';
import * as businessModels from '../models/business-models';

(function ($, CMS, GGRC) {
  let RiskAssessmentsExtension = {};
  let _risk_assessments_object_types = ['Program'];
  GGRC.extensions.push(RiskAssessmentsExtension);

  RiskAssessmentsExtension.name = 'risk_assessments';

  // Register RA models for use with `inferObjectType`
  RiskAssessmentsExtension.object_type_decision_tree = function () {
    return {
      risk_assessment: businessModels.RiskAssessment,
    };
  };

  businessModels.Program.attributes.risk_assessments
    = 'CMS.Models.RiskAssessment.stubs';

  // Configure mapping extensions for ggrc_risk_assessments
  RiskAssessmentsExtension.init_mappings = function () {
    let mappings = {
      Program: {
        risk_assessments: Direct('RiskAssessment',
          'program', 'risk_assessments'),
      },
      RiskAssessment: {
        related_objects_as_source: Proxy(
          null,
          'destination', 'Relationship',
          'source', 'related_destinations'
        ),
        related_objects_as_destination: Proxy(
          null,
          'source', 'Relationship',
          'destination', 'related_sources'
        ),
        related_objects: Multi(
          ['related_objects_as_source', 'related_objects_as_destination']
        ),
        destinations: Direct('Relationship', 'source', 'related_destinations'),
        sources: Direct('Relationship', 'destination', 'related_sources'),
        cycle_task_group_object_tasks: TypeFilter('related_objects',
          'CycleTaskGroupObjectTask'),
      },
    };
    new Mappings('ggrc_risk_assessments', mappings);
  };

  // Override GGRC.extra_widget_descriptors and GGRC.extra_default_widgets
  // Initialize widgets for risk assessment page
  RiskAssessmentsExtension.init_widgets = function init_widgets() {
    let descriptor = {};
    let page_instance = getPageInstance();
    let tree_widgets = GGRC.tree_view.base_widgets_by_type;

    _.each(_risk_assessments_object_types, function (type) {
      if (!type || !tree_widgets[type]) {
        return;
      }
      tree_widgets[type] = tree_widgets[type].concat(['RiskAssessment']);
    });
    if (page_instance && ~can.inArray(page_instance.constructor.shortName, _risk_assessments_object_types)) {
      descriptor[page_instance.constructor.shortName] = {
        RiskAssessment: {
          widget_id: 'risk_assessments',
          widget_name: 'Risk Assessments',
          widgetType: 'treeview',
          treeViewDepth: 0,
          content_controller_options: {
            add_item_view: GGRC.mustache_path +
              '/risk_assessments/tree_add_item.mustache',
            parent_instance: page_instance,
            model: businessModels.RiskAssessment,
            draw_children: true,
            allow_mapping: false,
          },
        },
      };
    }
    new GGRC.WidgetList('ggrc_risk_assessments', descriptor);
  };

  RiskAssessmentsExtension.init_mappings();
})(window.can.$, window.CMS, window.GGRC);
