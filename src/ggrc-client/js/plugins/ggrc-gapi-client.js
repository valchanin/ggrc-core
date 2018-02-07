/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

/**
 * Shows modal window that inform user about requested scopes.
 */
let showGapiModal = function ({scopes, onAccept, onDecline}) {
  let $modal = $('.ggrc_controllers_gapi_modal');
  if (!$modal.length) {
    import(/* webpackChunkName: "modalsCtrls" */'../controllers/modals/')
      .then(() => {
        $('<div class="modal hide">').modal_form()
          .appendTo(document.body).ggrc_controllers_gapi_modal({
            modal_title: 'Please log in to Google API',
            new_object_form: true,
            scopes,
            onAccept,
            onDecline,
          });
      });
  } else {
    $modal.modal_form('show');
  }
};

/**
 * The class is used to manage backend gdrive auth.
 */
class BackendGdriveClient {
  constructor() {
    this.showGapiModal = showGapiModal;
  }
  /**
   * Checks whether backend is authorized.
   * @return {Promise} - The flag indicating auth status.
   */
  async checkBackendAuth() {
    let response = await fetch('/is_gdrive_authorized', {
      credentials: 'same-origin',
    });

    if (response.status === 200) {
      return Promise.resolve();
    } else {
      return Promise.reject();
    }
  }

  /**
   * Shows google auth modal window.
   * @return {Object} - Child window object.
   */
  showAuthModal() {
    const popupSize = 600;
    const windowConfig = `
      toolbar=no,
      location=no,
      directories=no,
      status=no,
      menubar=no,
      scrollbars=yes,
      resizable=yes,
      copyhistory=no,
      width=${popupSize},
      height=${popupSize},
      left=${(window.screen.width - popupSize)/2},
      top=${(window.screen.height - popupSize)/2}`;

    let popup = window.open('/authorize', '_blank', windowConfig);

    return popup;
  }

  /**
   * Authorizes backend gapi client.
   * @param {Deferred} authDfd - The Deferred indicating result of the operation.
   */
  authorizeBackendGapi(authDfd) {
    let popup = this.showAuthModal();
    let timer = setInterval(()=> {
      if (popup.closed) {
        clearInterval(timer);
        this.checkBackendAuth()
          .then(authDfd.resolve, authDfd.reject);
      }
    }, 300);
  }

  /**
   * Makes auth request if backend returned "Unauthorized" status.
   * @param {*} action - Action that should be executed.
   * @param {*} rejectResponse - Data that should be returned if authorization will be failed.
   * @return {Deferred} - The deferred object containing result of action or predefined data in case of auth failure.
   */
  withAuth(action, rejectResponse) {
    return action().then(null, (e)=> {
      // if BE auth token was corrupted or missed.
      if (e.status === 401) {
        let authDfd = can.Deferred();
        let resultDfd = can.Deferred();

        this.showGapiModal({
          scopes: ['https://www.googleapis.com/auth/drive'],
          onAccept: ()=> {
            this.authorizeBackendGapi(authDfd);
            return authDfd.promise();
          },
          onDecline: ()=> authDfd.reject('User canceled operation'),
        });

        authDfd.then(()=> {
          action().then(resultDfd.resolve, resultDfd.reject);
        }, ()=> resultDfd.reject(rejectResponse));

        return resultDfd;
      }

      return e;
    });
  }
}

/**
 * The class is used to work with gapi.
 */
class GGRCGapiClient {
  constructor() {
    this.currentScopes = [
      'https://www.googleapis.com/auth/userinfo.email',
    ];
    this.loadedClientLibraries = {};
    this.oauthResult = can.Deferred();
    this.client = can.Deferred();
    this.showGapiModal = showGapiModal;

    this.loadGapiClient();
  }

  /**
   * Loads Google api client library.
   */
  loadGapiClient() {
    let script = document.createElement('script');
    script.src = 'https://apis.google.com/js/client.js?onload=resolvegapi';
    script.async = true;

    window.resolvegapi = ()=> {
      this.client.resolve(window.gapi);
      window.resolvegapi = null;
    };

    document.head.appendChild(script);
  }

  /**
   * Adds new scopes to the client.
   * @param {Array} newScopes - Array containing new scopes.
   * @return {Boolean} - flag indicates whether or not scopes were added.
   */
  addNewScopes(newScopes) {
    let scopesWereAdded = false;

    newScopes.forEach((scope)=> {
      if (!this.currentScopes.includes(scope)) {
        this.currentScopes.push(scope);
        scopesWereAdded = true;
      }
    });

    return scopesWereAdded;
  }

  /**
   * Authorizes user in google if needed.
   * @param {Array} requiredScopes - Scopes to access.
   * @return {Deferred} - Auth result.
   */
  authorizeGapi(requiredScopes = []) {
    let needToRequestForNewScopes = this.addNewScopes(requiredScopes);
    let token = gapi.auth.getToken();

    if (needToRequestForNewScopes || !token) {
      this.oauthResult.reject();
      this.oauthResult = can.Deferred();
      this.oauthResult.then(()=>this.checkLoggedUser());
      this.runAuthorization(true);
    }

    return this.oauthResult;
  }

  /**
   * Runs authorization process.
   * @param {Boolean} immediate - Try to suppress auth modal window.
   */
  runAuthorization(immediate) {
    let oauthResult = this.oauthResult;
    this.client.done(()=> {
      // make auth request
      this.makeGapiAuthRequest(immediate)
        .then(oauthResult.resolve, ()=> {
          if (immediate) {
            this.showGapiModal({
              scopes: this.currentScopes,
              onAccept: ()=> {
                this.runAuthorization();
                return this.oauthResult;
              },
              onDecline: ()=> {
                this.oauthResult.reject('User canceled operation');
              },
            });
          } else {
            oauthResult.reject();
          }
        });
    });
  }

  /**
   * Makes google api auth request.
   * @param {*} immediate - Whether or not dialog window should be suppressed if it's possible.
   * @return {Deferred} - Auth result.
   */
  makeGapiAuthRequest(immediate) {
    return gapi.auth.authorize({
      client_id: GGRC.config.GAPI_CLIENT_ID,
      login_hint: GGRC.current_user && GGRC.current_user.email,
      scope: this.currentScopes,
      immediate,
    });
  }

  /**
   * Makes gapi request
   * @param {Object} params - Request parameters.
   * @return {Deferred} - Request result.
   */
  makeGapiRequest({path = '', method = ''} = {}) {
    let result = can.Deferred();

    gapi.client.request({path, method})
      .then((response)=> {
        result.resolve(response.result);
      }, (response)=> {
        result.reject(response.result.error);
      });

    return result;
  }

  /**
   * Loads additional google api client libraries.
   * @param {String} libraryName - The name of required library.
   * @return {Deferred} - The requested library.
   */
  loadClientLibrary(libraryName) {
    let result = can.Deferred();

    if (this.loadedClientLibraries[libraryName]) {
      result.resolve(this.loadedClientLibraries[libraryName]);
    } else {
      gapi.client.load(libraryName, 'v2').then(()=>{
        let loadedLibrary = gapi.client[libraryName];
        this.loadedClientLibraries[libraryName] = loadedLibrary;
        result.resolve(loadedLibrary);
      });
    }

    return result;
  }

  /**
   * Check whether user looged in google with ggrc email.
   */
  checkLoggedUser() {
    this.loadClientLibrary('oauth2').then((oauth2)=> {
      oauth2.userinfo.get().execute((user)=> {
        if (user.error) {
          GGRC.Errors.notifier('error', user.error);
          return;
        }

        if (user.email.toLowerCase().trim() !==
        GGRC.current_user.email.toLowerCase().trim()) {
          GGRC.Errors.notifier('warning', `
            You are signed into GGRC as ${GGRC.current_user.email} 
            and into Google Apps as ${user.email}. 
            You may experience problems uploading evidence.`);
        }
      });
    });
  }
}

export let backendGdriveClient = new BackendGdriveClient();
export let gapiClient = new GGRCGapiClient();
