/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

class GGRCGapiClient {
  constructor() {
    this.currentScopes = [
      'https://www.googleapis.com/auth/userinfo.email',
    ];
    this.currentAuthResult = null;
    this.loadedClientLibraries = {};
  }

  /**
   * Loads Google api client library.
   * @return {Promise} - api client library.
   */
  async loadGapiClient() {
    if (window.gapi) {
      return Promise.resolve(window.gapi);
    } else {
      let script = document.createElement('script');
      script.src = 'https://apis.google.com/js/client.js?onload=resolvegapi';
      script.async = true;

      return new Promise((resolve, reject)=> {
        script.onerror = reject;
        window.resolvegapi = ()=> {
          resolve(window.gapi);
          window.resolvegapi = null;
        };

        document.head.appendChild(script);
      });
    }
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
   * @return {Promise} - Auth result.
   */
  async authorizeGapi(requiredScopes = []) {
    let gapi = await this.loadGapiClient();

    let needToRequestForNewScopes = this.addNewScopes(requiredScopes);
    let token = gapi.auth.getToken();

    if (needToRequestForNewScopes || !token || !this.currentAuthResult) {
      try {
        this.currentAuthResult = await this.runAuthorization();
        this.checkLoggedUser();
      } catch (e) {
        return Promise.reject(e);
      }
    }

    return Promise.resolve({
      authResult: this.currentAuthResult,
      gapi,
    });
  }

  /**
   * Runs authorization process.
   * @return {Promise} - Auth result.
   */
  async runAuthorization() {
    return new Promise((resolve, reject)=> {
      // try to authorized immediately.
      this.makeGapiAuthRequest(true).then(resolve, ()=> {
        // if immediate-auth failed, show modal.
        this.showGapiModal().then(()=>{
          // if user accepted, authorize with gapi form.
          this.makeGapiAuthRequest().then(resolve, reject);
        }, reject);
      });
    });
  }

  /**
   * Makes google api auth request.
   * @param {*} immediate - Whether or not dialog window should be suppressed if it's possible.
   * @return {Promise} - Auth result.
   */
  async makeGapiAuthRequest(immediate) {
    let gapi = await this.loadGapiClient();

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
   * @return {Promise} - Request result.
   */
  async makeGapiRequest({path = '', method = ''} = {}) {
    let gapi = await this.loadGapiClient();

    let response = await gapi.client.request({
      path,
      method,
    });

    if (response.error) {
      return Promise.reject(response.error);
    } else {
      return Promise.resolve(response.result);
    }
  }

  /**
   * Loads additional google api client libraries.
   * @param {String} libraryName - The name of required library.
   * @return {Promise} - The requested library.
   */
  async loadClientLibrary(libraryName) {
    let gapi = await this.loadGapiClient();

    if (!this.loadedClientLibraries[libraryName]) {
      return gapi.client.load(libraryName, 'v2').then(()=>{
        let loadedLibrary = gapi.client[libraryName];
        this.loadedClientLibraries[libraryName] = loadedLibrary;
        return loadedLibrary;
      });
    } else {
      return Promise.resolve(this.loadedClientLibraries[libraryName]);
    }
  }

  /**
   * Check whether user looged in google with ggrc email.
   */
  async checkLoggedUser() {
    let oauth2 = await this.loadClientLibrary('oauth2');

    oauth2.userinfo.get().execute((user)=> {
      if (user.email.toLowerCase().trim() !==
      GGRC.current_user.email.toLowerCase().trim()) {
        GGRC.Errors.notifier('warning', `
          You are signed into GGRC as ${GGRC.current_user.email} 
          and into Google Apps as ${user.email}. 
          You may experience problems uploading evidence.`);
      }
    });
  }

  /**
   * Shows modal window that inform user about requested scopes.
   */
  showGapiModal() {
    return new Promise((resolve, reject)=> {
      let $modal = $('.ggrc_controllers_gapi_modal');
      if (!$modal.length) {
        import(/* webpackChunkName: "modalsCtrls" */'../controllers/modals/')
          .then(() => {
            $('<div class="modal hide">').modal_form()
              .appendTo(document.body).ggrc_controllers_gapi_modal({
              scopes: this.currentScopes,
              modal_title: 'Please log in to Google API',
              new_object_form: true,
              accept: resolve,
              decline: reject,
            });
        });
      } else {
        $modal.modal_form('show');
      }
    });
  };
}

export default new GGRCGapiClient();
