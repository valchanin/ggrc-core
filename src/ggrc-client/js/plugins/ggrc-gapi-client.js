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

export let backendGdriveClient = new BackendGdriveClient();
