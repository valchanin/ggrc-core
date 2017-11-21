/*
  Copyright (C) 2017 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

const router = new can.Map();

class RouterConfig {
  static setupRoutes(routes) {
    routes.forEach((route)=> {
      can.route(route.template, route.defaults);
    });
    can.route.map(router);
    can.route.ready();
  };
};

export default router;
export {RouterConfig};
