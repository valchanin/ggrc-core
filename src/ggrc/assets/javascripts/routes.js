/*
  Copyright (C) 2017 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

const ROUTES_CONFIG = [
  {
    template: ':widget',
    defaults: {},
  },
  {
    template: ':widget/:infoPaneType/:infoPaneId',
    defaults: {},
  },
];

export class RoutesConfig {
  static setupRoutes(appState) {
    ROUTES_CONFIG.forEach((config)=> {
      can.route(config.template, config.defaults);
    });
    can.route.map(appState);
    can.route.ready();
  };
};
