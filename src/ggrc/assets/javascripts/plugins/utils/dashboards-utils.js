/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (GGRC) {
  'use strict';

  /**
   * Util methods for integration with Dashboards.
   */
  GGRC.Utils.Dashboards = (function () {
    var DASHBOARD_CA_TYPES = ['text'];

    function getCaConfiguration() {
      var caNameRegexpString;
      var caValueRegexpString;

      if (GGRC.DASHBOARD_INTEGRATION) {
        caNameRegexpString = GGRC.DASHBOARD_INTEGRATION.ca_name_regexp;
        caValueRegexpString = GGRC.DASHBOARD_INTEGRATION.ca_value_regexp;
      }

      if (!caNameRegexpString || !caValueRegexpString) {
        return null;
      }

      return {
        caNameRegexp: new RegExp(caNameRegexpString),
        caValueRegexp: new RegExp(caValueRegexpString)
      };
    }

    /**
     * Determine whether dashbord integration is enabled for the model.
     * @param {Object} instance - Instance
     * @return {Boolean} True or False
     */
    function isDashboardEnabled(instance) {
      var configuration = getCaConfiguration();

      if (!configuration) {
        return false;
      }

      return instanceHasValidCas(
        instance,
        configuration.caNameRegexp,
        configuration.caValueRegexp
      );
    }

    /**
     * Get dashboards configuration for the model instance.
     * @param {Object} instance - The model instance
     * @return {Object} Url
     */
    function getDashboards(instance) {
      var configuration = getCaConfiguration();

      return getDashboardsFromCas(
        instance,
        configuration.caNameRegexp,
        configuration.caValueRegexp
      );
    }

    function instanceHasValidCas(instance, caNameRegexp, caValueRegexp) {
      return !!getDashboardsFromCas(
        instance, caNameRegexp, caValueRegexp).length;
    }

    function getDashboardsFromCas(instance, caNameRegexp, caValueRegexp) {
      var cads = can.makeArray(instance.attr('custom_attribute_definitions'));
      var cavs = can.makeArray(instance.attr('custom_attribute_values'));
      if (!cads.length || !cavs.length) {
        return [];
      }

      cavs = cavs.map(function (cav) {
        return cav.custom_attribute_id ? cav : cav.reify();
      });

      return cads.reduce(function (result, cad) {
        var caType = cad.attr('attribute_type');
        var dashboardName;
        var caName;
        var caNameMatches;
        var caValue;
        var cav;

        if (!DASHBOARD_CA_TYPES.includes(caType.toLowerCase())) {
          return result;
        }

        cav = cavs.find(function (cav) {
          return cav.custom_attribute_id === cad.id;
        });

        if (!cav) {
          return result;
        }

        caName = cad.attr('title');
        caNameMatches = caName.match(caNameRegexp);
        if (!caNameMatches) {
          return result;
        }

        caValue = cav.attr('attribute_value');
        if (!caValueRegexp.test(caValue)) {
          return result;
        }

        dashboardName = caNameMatches.length === 2 ? caNameMatches[1] : caName;

        return result.concat({
          name: dashboardName,
          url: caValue.replace('{{OBJECT_ID}}', instance.id)
        });
      }, []);
    }

    return {
      isDashboardEnabled: isDashboardEnabled,
      getDashboards: getDashboards
    };
  })();
})(window.GGRC, window.GGRC.Utils.Snapshots);
