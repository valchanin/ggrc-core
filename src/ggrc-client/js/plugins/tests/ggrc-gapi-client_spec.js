/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import gapiClient, {withBackendAuth} from '../ggrc-gapi-client';

describe('GGRC gapi client', ()=> {
  describe('loadGapiClient() method', ()=> {
    describe('if gapi object is not defined', ()=> {
      it('returns gapi object', (done)=> {
        let gapiObj = {
          test: 'utils',
        };
        window.gapi = gapiObj;

        gapiClient.loadGapiClient().then((client)=> {
          expect(client).toBe(gapiObj);
          done();
        });
      });
    });

    describe('if gapi object is not defined', ()=> {
      let appendChildSpy;
      beforeEach(()=> {
        window.gapi = null;
        appendChildSpy = spyOn(document.head, 'appendChild');
      });

      it('loads gapi library', ()=> {
        gapiClient.loadGapiClient();

        expect(appendChildSpy).toHaveBeenCalled();
      });

      it('returns gapi object after load', (done)=> {
        let gapiObj;
        appendChildSpy.and.callFake(()=> {
          gapiObj = {
            test: 'gapi',
          };
          window.gapi = gapiObj;
          window.resolvegapi();
        });

        gapiClient.loadGapiClient().then((client)=> {
          expect(client).toBe(gapiObj);
          done();
        });
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
    let getTokenSpy;
    let gapiClientStub;
    let addNewScopesSpy;
    let runAuthorizationSpy;
    beforeEach(()=> {
      getTokenSpy = jasmine.createSpy();
      gapiClientStub = {
        auth: {
          getToken: getTokenSpy,
        },
      };
      spyOn(gapiClient, 'loadGapiClient')
        .and.returnValue(Promise.resolve(gapiClientStub));
      addNewScopesSpy = spyOn(gapiClient, 'addNewScopes');
      runAuthorizationSpy = spyOn(gapiClient, 'runAuthorization');
      spyOn(gapiClient, 'checkLoggedUser');
    });

    it('loads gapi client', (done)=> {
      gapiClient.authorizeGapi().then(()=> {
        expect(gapiClient.loadGapiClient).toHaveBeenCalled();
        done();
      });
    });

    it('tries to add new scopes', (done)=> {
      gapiClient.authorizeGapi().then(()=> {
        expect(addNewScopesSpy).toHaveBeenCalled();
        done();
      });
    });

    it('gets current auth token', (done)=> {
      gapiClient.authorizeGapi().then(()=> {
        expect(getTokenSpy).toHaveBeenCalled();
        done();
      });
    });

    describe('runs authorization and checks logged user', ()=> {
      beforeEach(()=> {
        runAuthorizationSpy.and.returnValue(Promise.resolve());
      });
      afterEach((done)=> {
        gapiClient.authorizeGapi().then(()=> {
          expect(gapiClient.runAuthorization).toHaveBeenCalled();
          expect(gapiClient.checkLoggedUser).toHaveBeenCalled();
          done();
        });
      });

      it('when new scope was added', ()=> {
        addNewScopesSpy.and.returnValue(true);
      });

      it('when new scope was not added but there is no token', ()=> {
        addNewScopesSpy.and.returnValue(false);
        getTokenSpy.and.returnValue(null);
      });
    });

    it('returns gapi client and auth result if auth was successful', (done)=> {
      let expectedAuthResult = {
        logged: 'true',
      };
      runAuthorizationSpy.and.returnValue(Promise.resolve(expectedAuthResult));
      addNewScopesSpy.and.returnValue(true);

      gapiClient.authorizeGapi().then(({authResult, gapi})=> {
        expect(authResult).toBe(expectedAuthResult);
        expect(gapi).toBe(gapiClientStub);
        done();
      });
    });

    it('retruns error if auth was not successful', (done)=> {
      let errorStub = {
        code: 'test',
      };
      addNewScopesSpy.and.returnValue(true);
      runAuthorizationSpy.and.returnValue(Promise.reject(errorStub));

      gapiClient.authorizeGapi().then(null, (err)=> {
        expect(err).toBe(errorStub);
        done();
      });
    });
  });

  describe('runAuthorization() method', ()=> {
    let authorizeBackendGapiSpy;
    let makeGapiAuthRequestSpy;
    let showGapiModalSpy;
    beforeEach(()=> {
      authorizeBackendGapiSpy = spyOn(gapiClient, 'authorizeBackendGapi');
      makeGapiAuthRequestSpy = spyOn(gapiClient, 'makeGapiAuthRequest');
      showGapiModalSpy = spyOn(gapiClient, 'showGapiModal');
    });

    it('returns error if BE auth failed', (done)=> {
      authorizeBackendGapiSpy.and.returnValue(Promise.reject('BE error'));

      gapiClient.runAuthorization().then(null, (err)=> {
        expect(err).toBe('BE error');
        done();
      });
    });

    it('returns auth result if immediate auth was successful', (done)=> {
      makeGapiAuthRequestSpy.and.returnValue(Promise.resolve('immediate'));

      gapiClient.runAuthorization().then((result)=> {
        expect(result).toBe('immediate');
        done();
      });
    });

    it('returns error if user declined gapi modal', (done)=> {
      makeGapiAuthRequestSpy.and.returnValue(Promise.reject());
      showGapiModalSpy.and.returnValue(Promise.reject('User closed modal'));

      gapiClient.runAuthorization().then(null, (error)=> {
        expect(error).toBe('User closed modal');
        done();
      });
    });

    it('returns auth result if user accepted gapi modal', (done)=> {
      makeGapiAuthRequestSpy.and.callFake((immediate)=> {
        return immediate ? Promise.reject() : Promise.resolve('success');
      });
      showGapiModalSpy.and.returnValue(Promise.resolve());

      gapiClient.runAuthorization().then((result) => {
        expect(result).toBe('success');
        done();
      });
    });
  });

  describe('loadClientLibrary() method', ()=> {
    let gapiClientStub;
    let gapiLoadStub;
    beforeEach(()=> {
      gapiLoadStub = jasmine.createSpy();
      gapiClientStub = {
        client: {load: gapiLoadStub},
      };
      spyOn(gapiClient, 'loadGapiClient')
        .and.returnValue(Promise.resolve(gapiClientStub));
    });

    it('loads gapi client', (done)=> {
      gapiLoadStub.and.returnValue(Promise.resolve());
      gapiClient.loadClientLibrary().then(()=> {
        expect(gapiClient.loadGapiClient).toHaveBeenCalled();
        done();
      });
    });

    it('returns saved library if it was loaded earlier', (done)=> {
      gapiClient.loadedClientLibraries = {
        lib1: 'loaded',
      };

      gapiClient.loadClientLibrary('lib1').then((lib)=> {
        expect(lib).toBe('loaded');
        expect(gapiLoadStub).not.toHaveBeenCalled();
        done();
      });
    });

    it('loads library if it was not loaded previously', (done)=> {
      gapiClient.loadedClientLibraries = [];
      gapiLoadStub.and.callFake(()=> {
        gapiClientStub.client['testlib'] = 'loaded';
        return Promise.resolve();
      });

      gapiClient.loadClientLibrary('testlib').then((lib)=> {
        expect(lib).toBe('loaded');
        expect(gapiClient.loadedClientLibraries['testlib']).toBe('loaded');
        done();
      });
    });
  });
});

describe('withBackendAuth() method', ()=> {
  let action;
  let thenStub;

  beforeEach(()=> {
    thenStub = jasmine.createSpy();
    action = jasmine.createSpy().and.returnValue({
      then: thenStub,
    });
  });

  it('calls original action', ()=> {
    withBackendAuth(action);

    expect(action).toHaveBeenCalled();
  });

  it('does not handle successful case', ()=> {
    let successArgument;
    thenStub.and.callFake((success)=> {
      successArgument = success;
    });

    withBackendAuth(action);

    expect(successArgument).toBe(null);
  });

  it('returns original error if status is not 401', (done)=> {
    let error = {
      status: 404,
    };
    action.and.returnValue(can.Deferred().reject(error));

    withBackendAuth(action).fail((e)=> {
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
    });

    describe('and BE auth was successful', ()=> {
      beforeEach(()=> {
        spyOn(gapiClient, 'authorizeBackendGapi').and.callFake(()=> {
          action.and.returnValue(can.Deferred().resolve('response'));
          return can.Deferred().resolve();
        });
      });

      it('returns result of original action', (done)=> {
        withBackendAuth(action).then((result)=> {
          expect(result).toBe('response');
          done();
        });
      });
    });

    describe('and BE auth was unsuccessful', ()=> {
      beforeEach(()=> {
        spyOn(gapiClient, 'authorizeBackendGapi')
          .and.returnValue(can.Deferred().reject());
      });

      it('returns provided response', (done)=> {
        withBackendAuth(action, 'failed').then(null, (error)=> {
          expect(error).toBe('failed');
          done();
        });
      });
    });
  });
});
