/*
  Copyright (C) 2018 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import * as CurrentPageUtils from '../../plugins/utils/current-page-utils';
import * as DashboardUtils from '../../plugins/utils/dashboards-utils';
import Ctrl from '../inner-nav-controller';

describe('CMS.Controllers.InnerNav', function () {
  'use strict';

  describe('sortWidgets() method', function () {
    let ctrlInst; // fake controller instance
    let sortWidgets;
    let options;

    beforeEach(function () {
      options = {
        widget_list: new can.Observe.List([]),
      };

      ctrlInst = {
        options: new can.Map(options),
      };

      sortWidgets = Ctrl.prototype.sortWidgets.bind(ctrlInst);
    });

    it('sorts widgets by their "order" attribute', function () {
      let widgetOrder;
      let widgets = [
        {internav_display: 'aaa', order: 40},
        {internav_display: 'bbb', order: 20},
        {internav_display: 'ccc', order: 50},
        {internav_display: 'ddd', order: 10},
        {internav_display: 'eee', order: 30},
      ];
      options.widget_list.replace(widgets);

      sortWidgets();

      widgetOrder = _.map(ctrlInst.options.widget_list, 'internav_display');
      expect(widgetOrder).toEqual(['ddd', 'bbb', 'eee', 'aaa', 'ccc']);
    });

    it('places widgets with unknown "order" at' +
      'the end and sort them in alphabetical order', function () {
      let widgetOrder;
      let widgets = [
        {internav_display: 'abc'},
        {internav_display: 'aaa', order: 40},
        {internav_display: 'cba'},
        {internav_display: 'ccc', order: 50},
        {internav_display: 'qwerty'},
        {internav_display: 'ddd', order: 10},
        {internav_display: 'xyz'},
        {internav_display: 'eee', order: 30},
      ];
      options.widget_list.replace(widgets);

      sortWidgets();

      widgetOrder = _.map(ctrlInst.options.widget_list, 'internav_display');
      expect(widgetOrder)
        .toEqual(['ddd', 'eee', 'aaa', 'ccc', 'abc', 'cba', 'qwerty', 'xyz']);
    });
  });

  describe('"setTabsPriority" method', () => {
    let method;
    let options;

    beforeEach(() => {
      options = new can.Map({
        widget_list: new can.Observe.List([
          {name: 'aaa'},
          {name: 'bbb'},
          {name: 'ccc'},
          {name: 'ddd'},
          {name: 'eee'},
          {name: 'fff'},
          {name: 'ggg'},
        ]),
        priorityTabs: null,
        notPriorityTabs: null,
      });

      let ctrl = {
        options: options,
      };

      method = Ctrl.prototype.setTabsPriority.bind(ctrl);
    });

    it('sets first 5 tabs as priority for audit', () => {
      spyOn(CurrentPageUtils, 'getPageType').and.returnValue('Audit');
      spyOn(DashboardUtils, 'isDashboardEnabled').and.returnValue(false);

      method();

      expect(options.priorityTabs.length).toEqual(5);
      expect(options.notPriorityTabs.length).toEqual(2);
    });

    it('sets first 6 tabs as priority for audit when dashboard is enabled',
      () => {
        spyOn(CurrentPageUtils, 'getPageType').and.returnValue('Audit');
        spyOn(DashboardUtils, 'isDashboardEnabled').and.returnValue(true);

        method();

        expect(options.priorityTabs.length).toEqual(6);
        expect(options.notPriorityTabs.length).toEqual(1);
      });

    it('sets all tabs as priority for all objects except audit', () => {
      spyOn(CurrentPageUtils, 'getPageType').and.returnValue('any type');

      method();

      expect(options.priorityTabs.length).toEqual(7);
      expect(options.notPriorityTabs).toEqual(null);
    });
  });
});
