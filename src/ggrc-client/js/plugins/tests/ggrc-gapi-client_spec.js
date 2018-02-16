/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import {backendGdriveClient} from '../ggrc-gapi-client';

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
      });

      it('returns provided response if user closed modal', (done)=> {
        spyOn(backendGdriveClient, 'showGapiModal')
          .and.callFake(({onDecline})=> {
            onDecline();
          });

        backendGdriveClient.withAuth(action, 'failed')
          .then(null, (error)=> {
            expect(error).toBe('failed');
            done();
          });
      });

      it('returns provided response if auth was not successful', (done)=> {
        spyOn(backendGdriveClient, 'showGapiModal')
          .and.callFake(({onAccept})=> {
            onAccept();
          });
        spyOn(backendGdriveClient, 'authorizeBackendGapi')
          .and.callFake((dfd)=> {
            dfd.reject();
          });

        backendGdriveClient.withAuth(action, 'failed')
          .then(null, (error)=> {
            expect(error).toBe('failed');
            done();
          });
      });

      it('returns result of original action if auth was successful', (done)=> {
        spyOn(backendGdriveClient, 'showGapiModal')
          .and.callFake(({onAccept})=> {
            onAccept();
          });
        spyOn(backendGdriveClient, 'authorizeBackendGapi')
          .and.callFake((dfd)=> {
            action.and.returnValue(can.Deferred().resolve('response'));
            dfd.resolve();
          });

        backendGdriveClient.withAuth(action).then((result)=> {
          expect(result).toBe('response');
          done();
        });
      });
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
