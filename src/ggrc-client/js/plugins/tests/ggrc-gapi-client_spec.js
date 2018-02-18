/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import {
  backendGdriveClient,
  gapiClient,
} from '../ggrc-gapi-client';

describe('backendGdriveClient', ()=> {
  describe('withAuth() method', ()=> {
    let action;
    let thenStub;

    beforeEach(()=> {
      thenStub = jasmine.createSpy();
      action = jasmine.createSpy().and.returnValue({
        then: thenStub,
      });
    });

    it('calls original action', ()=> {
      backendGdriveClient.withAuth(action);

      expect(action).toHaveBeenCalled();
    });

    it('does not handle successful case', ()=> {
      let successArgument;
      thenStub.and.callFake((success)=> {
        successArgument = success;
      });

      backendGdriveClient.withAuth(action);

      expect(successArgument).toBe(null);
    });

    it('returns original error if status is not 401', (done)=> {
      let error = {
        status: 404,
      };
      action.and.returnValue(can.Deferred().reject(error));

      backendGdriveClient.withAuth(action).fail((e)=> {
        expect(e).toBe(error);
        done();
      });
    });

    describe('if status was 401', ()=> {
      let error = {
        status: 401,
      };
      beforeEach(()=> {
        action.and.returnValue(can.Deferred().reject(error));
        spyOn(backendGdriveClient, 'runBackendAuth');
        backendGdriveClient.authDfd = null;
      });

      describe('runs backend auth', () => {
        beforeEach(()=> {
          backendGdriveClient.runBackendAuth.and.callFake(()=> {
            backendGdriveClient.authDfd = can.Deferred();
          });
        });

        afterEach((done)=> {
          backendGdriveClient.withAuth(action);

          backendGdriveClient.authDfd.resolve().then(()=> {
            expect(backendGdriveClient.runBackendAuth).toHaveBeenCalled();
            done();
          });
        });

        it('if there was no auth dfd', ()=> {
          backendGdriveClient.authDfd = null;
        });

        it('if there auth dfd was in resolved state', ()=> {
          backendGdriveClient.authDfd = can.Deferred().resolve();
        });

        it('if there auth dfd was in rejected state', ()=> {
          backendGdriveClient.authDfd = can.Deferred().reject();
        });
      });

      it('returns provided response if auth was not successful', (done)=> {
        backendGdriveClient.runBackendAuth.and.callFake(()=> {
          backendGdriveClient.authDfd = can.Deferred().reject();
        });

        backendGdriveClient.withAuth(action, 'failed')
          .then(null, (error)=> {
            expect(error).toBe('failed');
            done();
          });
      });

      it('returns result of original action if auth was successful', (done)=> {
        backendGdriveClient.runBackendAuth.and.callFake(()=> {
          backendGdriveClient.authDfd = can.Deferred().resolve();
          action.and.returnValue(can.Deferred().resolve('response'));
        });

        backendGdriveClient.withAuth(action).then((result)=> {
          expect(result).toBe('response');
          done();
        });
      });
    });
  });

  describe('runBackendAuth() method', ()=> {
    beforeEach(()=> {
      backendGdriveClient.authDfd = null;
      spyOn(backendGdriveClient, 'showGapiModal');
    });

    it('initializes autDfd', ()=> {
      backendGdriveClient.runBackendAuth();

      expect(backendGdriveClient.authDfd.state()).toBe('pending');
    });

    it('rejects authDfd if user closed modal', (done)=> {
      backendGdriveClient.showGapiModal.and.callFake(({onDecline})=> {
        onDecline();
      });

      backendGdriveClient.runBackendAuth();

      backendGdriveClient.authDfd.then(null, (error)=> {
        expect(error).toBe('User canceled operation');
        done();
      });
    });

    it('authorizes backend if user accepted modal', ()=> {
      spyOn(backendGdriveClient, 'authorizeBackendGapi');
      backendGdriveClient.showGapiModal.and.callFake(({onAccept})=> {
        onAccept();
      });

      backendGdriveClient.runBackendAuth();

      expect(backendGdriveClient.authorizeBackendGapi).toHaveBeenCalled();
    });
  });

  describe('authorizeBackendGapi() method', ()=> {
    let popup;
    beforeEach(()=> {
      popup = {
        closed: false,
      };
      spyOn(backendGdriveClient, 'showAuthModal').and.returnValue(popup);
      spyOn(backendGdriveClient, 'checkBackendAuth')
        .and.returnValue(can.Deferred().resolve());
    });

    it('checkBackendAuth after closing popup', (done)=> {
      let dfd = can.Deferred();
      backendGdriveClient.authorizeBackendGapi(dfd);

      let timer = setInterval(()=> {
        popup.closed = true;
      }, 400);

      dfd.then(()=> {
        clearInterval(timer);
        expect(backendGdriveClient.checkBackendAuth).toHaveBeenCalled();
        done();
      });
    });
  });
});

describe('gapiClient', ()=> {
  describe('loadGapiClient() method', ()=> {
    let appendChildSpy;
    beforeEach(()=> {
      window.gapi = null;
      appendChildSpy = spyOn(document.head, 'appendChild');
    });

    it('loads gapi library', ()=> {
      gapiClient.loadGapiClient();

      expect(appendChildSpy).toHaveBeenCalled();
    });

    it('resolves client deferred after load', (done)=> {
      let gapiObj = {
        test: 'gapi',
      };
      gapiClient.client = can.Deferred();
      appendChildSpy.and.callFake(()=> {
        window.gapi = gapiObj;
        window.resolvegapi();
      });

      gapiClient.loadGapiClient();

      gapiClient.client.then((client)=> {
        expect(client).toBe(gapiObj);
        done();
      });
    });
  });

  describe('addNewScopes() method', ()=> {
    describe('if new scope was added', ()=> {
      let newScopes;
      beforeEach(()=> {
        gapiClient.currentScopes = ['1'];
        newScopes = ['2'];
      });

      it('adds new scope', ()=>{
        gapiClient.addNewScopes(newScopes);

        expect(gapiClient.currentScopes).toEqual(['1', '2']);
      });

      it('returns true', ()=>{
        let result = gapiClient.addNewScopes(newScopes);

        expect(result).toBe(true);
      });
    });

    describe('if new scope was not added', ()=> {
      let newScopes;
      beforeEach(()=> {
        gapiClient.currentScopes = ['1', '2', '3'];
        newScopes = ['2'];
      });

      it('does not add scope', ()=> {
        gapiClient.addNewScopes(newScopes);

        expect(gapiClient.currentScopes).toEqual(['1', '2', '3']);
      });

      it('returns false', ()=>{
        let result = gapiClient.addNewScopes(newScopes);

        expect(result).toBe(false);
      });
    });
  });

  describe('authorizeGapi() method', ()=> {
    beforeEach(()=> {
      window.gapi = {
        auth: {
          getToken: jasmine.createSpy().and.returnValue('token'),
        },
      };
      gapiClient.oauthResult = can.Deferred();
      spyOn(gapiClient, 'addNewScopes');
      spyOn(gapiClient, 'runAuthorization');
      spyOn(gapiClient, 'checkLoggedUser');
    });

    it('tries to add new scopes', (done)=> {
      gapiClient.oauthResult.resolve();

      gapiClient.authorizeGapi().then(()=> {
        expect(gapiClient.addNewScopes).toHaveBeenCalled();
        done();
      });
    });

    it('gets current auth token', (done)=> {
      gapiClient.oauthResult.resolve();

      gapiClient.authorizeGapi().then(()=> {
        expect(gapi.auth.getToken).toHaveBeenCalled();
        done();
      });
    });

    describe('runs authorization and checks logged user', ()=> {
      afterEach((done)=> {
        gapiClient.authorizeGapi();
        gapiClient.oauthResult.resolve().then(()=> {
          expect(gapiClient.runAuthorization).toHaveBeenCalled();
          expect(gapiClient.checkLoggedUser).toHaveBeenCalled();
          done();
        });
      });

      it('when new scope was added', ()=> {
        gapiClient.addNewScopes.and.returnValue(true);
      });

      it('when new scope was not added but there is no token', ()=> {
        gapiClient.addNewScopes.and.returnValue(false);
        gapi.auth.getToken.and.returnValue(null);
      });
    });

    it('calls checkLoggedUser() when oauthResult was resolved', (done)=> {
      gapiClient.oauthResult = can.Deferred();
      gapiClient.addNewScopes.and.returnValue(true);

      gapiClient.authorizeGapi().resolve().then(()=> {
        expect(gapiClient.checkLoggedUser).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('runAuthorization() method', ()=> {
    let authDfd;
    beforeEach(()=> {
      authDfd = can.Deferred();
      gapiClient.client = can.Deferred().resolve();
      spyOn(gapiClient, 'makeGapiAuthRequest').and.returnValue(authDfd);
      spyOn(gapiClient, 'showGapiModal');
    });

    it('makes gapi auth request', ()=> {
      gapiClient.runAuthorization();

      expect(gapiClient.makeGapiAuthRequest).toHaveBeenCalled();
    });

    it('resolves oauth if auth request was successful', (done)=> {
      gapiClient.oauthResult = can.Deferred();
      authDfd.resolve('authResult');

      gapiClient.runAuthorization();

      authDfd.then((result)=> {
        expect(result).toBe('authResult');
        done();
      });
    });

    describe('if auth request was not successful', ()=> {
      beforeEach(()=> {
        authDfd.reject();
      });

      describe('and immediate flag was turned on', ()=> {
        it('shows gapi modal', ()=> {
          gapiClient.runAuthorization(true);

          expect(gapiClient.showGapiModal).toHaveBeenCalled();
        });

        describe('and gapi modal was accepted', ()=> {
          it('calls runAuthorization again', ()=> {
            gapiClient.showGapiModal.and.callFake(({onAccept})=> {
              spyOn(gapiClient, 'runAuthorization');
              onAccept();
            });

            gapiClient.runAuthorization(true);

            expect(gapiClient.runAuthorization).toHaveBeenCalled();
          });
        });

        describe('and gapi modal was declined', ()=> {
          it('rejects oauth', (done)=> {
            gapiClient.oauthResult = can.Deferred();
            gapiClient.showGapiModal.and.callFake(({onDecline})=> {
              spyOn(gapiClient, 'runAuthorization');
              onDecline();
            });

            gapiClient.runAuthorization(true);

            gapiClient.oauthResult.then(null, (result)=> {
              expect(result).toBe('User canceled operation');
              done();
            });
          });
        });
      });

      describe('and immediate flag was turned off', ()=> {
        it('rejects oauth', ()=> {
          gapiClient.oauthResult = can.Deferred();

          gapiClient.runAuthorization();

          expect(gapiClient.oauthResult.state()).toBe('rejected');
        });
      });
    });
  });

  describe('loadClientLibrary() method', ()=> {
    beforeEach(()=> {
      window.gapi = {
        client: {
          load: jasmine.createSpy(),
        },
      };
    });

    it('returns saved library if it was loaded earlier', (done)=> {
      gapiClient.loadedClientLibraries = {
        lib1: 'loaded',
      };

      gapiClient.loadClientLibrary('lib1').then((lib)=> {
        expect(lib).toBe('loaded');
        expect(gapi.client.load).not.toHaveBeenCalled();
        done();
      });
    });

    it('loads library if it was not loaded previously', (done)=> {
      gapiClient.loadedClientLibraries = [];
      gapi.client.load.and.callFake(()=> {
        gapi.client['testlib'] = 'loaded';
        return can.Deferred().resolve();
      });

      gapiClient.loadClientLibrary('testlib').then((lib)=> {
        expect(lib).toBe('loaded');
        expect(gapiClient.loadedClientLibraries['testlib']).toBe('loaded');
        done();
      });
    });
  });

  describe('makeGapiRequest() method', ()=> {
    let requestDfd;
    beforeEach(()=> {
      requestDfd = can.Deferred();
      window.gapi = {
        client: {
          request: jasmine.createSpy().and.returnValue(requestDfd),
        },
      };
    });

    it('resolves success response correctly', (done)=> {
      requestDfd.resolve({
        result: 'result',
      });

      gapiClient.makeGapiRequest().then((response)=> {
        expect(response).toBe('result');
        done();
      });
    });

    it('resolves error response correctly', (done)=> {
      requestDfd.reject({
        result: {
          error: 'error',
        },
      });

      gapiClient.makeGapiRequest().then(null, (response)=> {
        expect(response).toBe('error');
        done();
      });
    });
  });
});
