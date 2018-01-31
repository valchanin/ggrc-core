/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, $, CMS, GGRC) {
  let random = Date.now();
  let scopes = new can.List(['https://www.googleapis.com/auth/userinfo.email']);

  $(function () {
    $(document.body).ggrc_controllers_gapi({scopes: scopes});
  });

  window['resolvegapi' + random] = function (gapi) {
    GGRC.Controllers.GAPI.gapidfd.resolve(gapi);
    delete window['resolvegapi' + random];
  };
  $('head').append('<script type="text/javascript" src="https://apis.google.com/js/client.js?onload=resolvegapi' + random + '"></script>');
})(window.can, window.can.$, window.CMS, window.GGRC);
