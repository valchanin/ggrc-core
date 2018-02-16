/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

(function (CMS, GGRC, can, $) {
  can.Control('GGRC.Controllers.GAPI', {
    canonical_instance: null,
    oauth_dfd: new $.Deferred(),
    o2dfd: null,
    drivedfd: null,
    gapidfd: new $.Deferred(), // DFD which is resolved upon gapi library loader is available
    reAuthorize: function (token) {
      var params = ['https://www.googleapis.com/auth/drive'];
      var dfd;

      if (_.isEmpty(token)) {
        dfd = this.authorize(params, true);
      } else {
        dfd = this.authorize(params);
      }

      return dfd;
    },
    authorize: function (newscopes, force) {
      return this.canonical_instance.authorize(newscopes, force);
    },
    doGAuth: function (scopes, usePopup) {
      var that = this;
      var $modal;

      this.drive = this.drive || new $.Deferred();
      if (this.oauth_dfd.state() !== 'pending') {
        this.oauth_dfd = new $.Deferred();
      }
      // loading gapi client libraries
      can.each({
        drivedfd: 'drive',
        o2dfd: 'oauth2'
      }, function (p, d) {
        if (!that[d]) {
          that[d] = new $.Deferred();
          that.gapidfd.done(function () {
            window.gapi.client.load(p, 'v2', function (result) {
              if (!result) {
                that[d].resolve();
              } else {
                that[d].reject(result);
              }
            });
          });
        }
      });

      if (usePopup) {
        $modal = $('.ggrc_controllers_gapi_modal');
        if (!$modal.length) {
          import(/* webpackChunkName: "modalsCtrls" */'./modals')
            .then(() => {
              $('<div class="modal hide">').modal_form()
                .appendTo(document.body).ggrc_controllers_gapi_modal({
                scopes: scopes,
                modal_title: 'Please log in to Google API',
                new_object_form: true,
                onAccept: ()=> {
                  that.doGAuth_step2(null, true);
                  return that.oauth_dfd;
                },
                onDecline: ()=> {
                  that.oauth_dfd.reject('User canceled operation');
                },
              });
          });
        } else {
          $modal.modal_form('show');
        }
      } else {
        this.doGAuth_step2(scopes, usePopup);
      }
    },
    doGAuth_step2: function (scopes, usePopup) {
      var authdfd = new $.Deferred();
      var that = this;

      scopes = scopes || this.canonical_instance.options.scopes;

      this.gapidfd.done(function () {
        window.gapi.auth.authorize({
          client_id: GGRC.config.GAPI_CLIENT_ID,
          scope: scopes.serialize(),
          immediate: !usePopup,
          login_hint: GGRC.current_user && GGRC.current_user.email
        }).then(function (authresult) {
          authdfd.resolve(authresult);
        }, function () {
          if (!usePopup) {
            that.doGAuth(scopes, true);
            authdfd.reject('login required. Switching to non-immediate');
          } else {
            this.oauth_dfd.reject();
            authdfd.reject('auth failed');
          }
        }.bind(this));
      }.bind(this));

      $.when(authdfd, this.o2dfd)
      .then(function (authresult) {
        var o2d = new $.Deferred();

        gapi.client.oauth2.userinfo.get().execute(function (user) {
          if (user.error) {
            $(document.body).trigger('ajax:flash', {error: user.error});
            o2d.reject(user.error);
          } else {
            o2d.resolve(user);
          }
        });

        return $.when(authresult, o2d);
      })
      .done(function (authresult, o2result) { // success
        if (!authresult) {
          return; // assume we had to do a non-immediate auth
        }

        if (o2result.email.toLowerCase().trim() !==
          GGRC.current_user.email.toLowerCase().trim()) {
          $(document.body).trigger(
            'ajax:flash', {warning: ['You are signed into GGRC as',
              GGRC.current_user.email, 'and into Google Apps as',
              o2result.email,
              '. You may experience problems uploading evidence.'
              ].join(' ')
            });
        }
        this.oauth_dfd.resolve(authresult, o2result);
      }.bind(this));
    },
    gapi_request_with_auth: function (params) {
      var that = this;

      return that.authorize(params.scopes).then(function () {
        var dfd = new $.Deferred();
        var cb = params.callback;
        var checkAuth = function (result) {
          var args = can.makeArray(arguments);
          args.unshift(dfd);
          if (result && result.error && result.error.code === 401) {
            // that.doGAuth(scopes); //changes oauth_dfd to a new deferred
            params.callback = cb;
            that.authorize(params.scopes, true)
              .then($.proxy(that.gapi_request_with_auth, that, params))
              .then(function () {
                dfd.resolve.apply(dfd, arguments);
              }, function () {
                dfd.reject.apply(dfd, arguments);
              });
          } else {
            cb.apply(window, args);
          }
        };
        params.callback = checkAuth;
        if (typeof params.path === 'function') {
          params.path = params.path();
        }
        window.gapi.client.request(params);
        return dfd.promise();
      });
    }
  }, {
    init: function () {
      this._super.apply(this, arguments);
      if (!this.constructor.canonical_instance) {
        this.constructor.canonical_instance = this;
      }

      this.doGAuthWithScopes = _.debounce(this.constructor.doGAuth.bind(
          this.constructor, this.options.scopes, false), 500);
    },
    authorize: function (newscopes, force) {
      var dfd = this.constructor.oauth_dfd;
      var that = this;
      var reAuthWithNewScopes = false;

      can.each(newscopes, function (ns) {
        // if new scope not in the list of scopes
        if (!_.includes(that.options.scopes, ns)) {
          that.options.scopes.push(ns);
          reAuthWithNewScopes = true;
        }
      });

      if (force || reAuthWithNewScopes) {
        // rejecting old Promise as it eventually might be resolved which will
        // cause the double execution of the code
        this.constructor.oauth_dfd.reject();
        // creating new Promise and running the Auth process again
        dfd = this.constructor.oauth_dfd = new $.Deferred();
        this.doGAuthWithScopes();
      }

      return dfd;
    },
    '{scopes} change': function (scopes, ev) {
      this.doGAuthWithScopes(); // debounce in case we push several scopes in sequence
    }
  });
})(window.CMS, window.GGRC, window.can, window.can.$);
