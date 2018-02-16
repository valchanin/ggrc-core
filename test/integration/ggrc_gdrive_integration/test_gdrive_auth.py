# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Unit tests for Snapshot block converter class."""

import mock
import flask
from werkzeug.exceptions import Unauthorized

from integration.ggrc import TestCase
import ggrc.gdrive as gi


class TestAuthorizationFlow(TestCase):
  """Unit tests for gDrive authorization flow."""
  DUMMY_STATE = '123'

  # flake8: noqa pylint: disable=no-self-use
  @mock.patch('uuid.uuid4', lambda: TestAuthorizationFlow.DUMMY_STATE)
  def test_gdrive_authorization(self):
    """Test authorization routines work correctly"""
    gi.auth_gdrive()
    with mock.patch("ggrc.gdrive.client.OAuth2WebServerFlow") as mocked_flow:
      # after the first step:
      code = "1234567890"
      flask.request.args = {"code": code}
      # after the first step state is already in request.args
      flask.request.args.update({"state": TestAuthorizationFlow.DUMMY_STATE})
      gi.authorize_app()
      # assert step2 called
      mocked_flow.return_value.step2_exchange.assert_called_once_with(code)

  def test_gdrive_authorization_fail(self):
    """Test authorization cross site guard"""
    gi.auth_gdrive()
    with mock.patch("ggrc.gdrive.client.OAuth2WebServerFlow"):
      code = "1234567890"
      flask.request.args = {"code": code}
      flask.request.args.update({"state": "wrong state"})
      with self.assertRaises(Unauthorized):
        gi.authorize_app()
