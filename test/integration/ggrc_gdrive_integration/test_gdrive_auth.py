# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Unit tests for Snapshot block converter class."""

import mock
import flask

from integration.ggrc import TestCase
import ggrc.gdrive as gi


class TestAuthorizationFlow(TestCase):
  """Tests for gDrive authorization flow."""
  # pylint: disable=invalid-name

  def test_gdrive_authorization_step_1(self):
    """Test step 1 authorization

    After the 1st step, we need to have a 'state' from google oauth provider
    also, we should store redirect URL in flask.session to use it after
    successful authorization.
    """
    line = "http://some_test_redirect_url/export?model_type=Assessment"
    flask.request.url = line
    gi.authorize_gdrive()
    self.assertEquals(flask.session['ggrc_view_to_redirect'], line)
    self.assertTrue(flask.session['state'])

  def test_gdrive_authorization_step_1_self_redirect(self):
    """Test step 1 authorization self redirect

    In case of call '/authorize_gdrive' directly we need to update redirect URL
    in pointing to host_url to prevent stuck with the self-redirect.
    """
    flask.request.path = '/authorize_gdrive'
    flask.request.host_url = 'localhost:8080'
    gi.authorize_gdrive()
    self.assertEquals(flask.session['ggrc_view_to_redirect'], 'localhost:8080')
    self.assertTrue(flask.session['state'])

  def test_gdrive_authorization_step_2(self):
    """Test step 2 authorization.

    At step 2 we should get credentials from Google OAuth provider and
    store them in 'flask.session'
    We should clean flask.session['state'] and redirect to saved URL.
    """
    dummy_redirect_url = 'http://some_test_redirect_url'
    flask.session['ggrc_view_to_redirect'] = dummy_redirect_url
    flask.session['state'] = '12345'

    with mock.patch('google_auth_oauthlib.flow.Flow') as mocked_flow:
      dummy_credentials = mock.MagicMock()

      dummy_credentials.token = 'super secret token'
      dummy_credentials.refresh_token = 'super secret refresh_token'
      dummy_credentials.token_uri = 'http://some_token_uri'
      dummy_credentials.client_id = 'c_id'
      dummy_credentials.client_secret = 'c_secret'
      dummy_credentials.scopes = ['scope1']

      dummy_flow = mock.MagicMock()
      dummy_flow.credentials = dummy_credentials

      mocked_flow.from_client_config.return_value = dummy_flow
      redirect = gi.authorize()

    expected_dict_cred = {
        'token': dummy_credentials.token,
        'refresh_token': dummy_credentials.refresh_token,
        'token_uri': dummy_credentials.token_uri,
        'client_id': dummy_credentials.client_id,
        'client_secret': dummy_credentials.client_secret,
        'scopes': dummy_credentials.scopes,

    }
    self.assertEquals(flask.session['credentials'], expected_dict_cred)
    self.assertTrue('state' not in flask.session)
    self.assertEquals(redirect.location, dummy_redirect_url)
