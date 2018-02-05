# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""GDrive module"""

import flask
import google.oauth2.credentials as oauth2_credentials
import google_auth_oauthlib.flow
from flask import render_template

from werkzeug.exceptions import BadRequest

from ggrc import settings
from ggrc.app import app
from ggrc.login import login_required

_GOOGLE_AUTH_URI = "https://accounts.google.com/o/oauth2/auth"
_GOOGLE_TOKEN_URI = "https://accounts.google.com/o/oauth2/token"
_GOOGLE_API_GDRIVE_SCOPE = "https://www.googleapis.com/auth/drive"

CLIENT_CONFIG = {
    u'web': {
        u'token_uri': _GOOGLE_TOKEN_URI,
        u'auth_uri': _GOOGLE_AUTH_URI,
        u'client_id': settings.GAPI_CLIENT_ID,
        u'client_secret': settings.GAPI_CLIENT_SECRET,
    }
}


class UserCredentialException(Exception):
  pass


def get_credentials():
  """Returns stored credentials"""
  if 'credentials' not in flask.session:
    raise UserCredentialException('User credentials not found.')
  gdrive_credentials = oauth2_credentials.Credentials(
      **flask.session['credentials'])
  return gdrive_credentials


def verify_credentials():
  """Verify credentials to gdrive for the current user

  :return: None, if valid credentials are present, or redirect to authorize fn
  """
  if 'credentials' not in flask.session:
    return authorize_gdrive()
  gdrive_credentials = oauth2_credentials.Credentials(
      **flask.session['credentials'])
  if gdrive_credentials.expired:
    return authorize_gdrive()
  return None


@app.route("/check_be_authorization")
@login_required
def check_be_authorization():
  """Get export view"""
  if getattr(settings, "GAPI_CLIENT_ID", None):
    authorize = verify_credentials()
    if authorize:
      return authorize
  return render_template("gdrive/check_be_authorization.haml")


@app.route("/authorize_gdrive")
def authorize_gdrive():
  """1st step of oauth2 flow"""
  flow = google_auth_oauthlib.flow.Flow.from_client_config(
      CLIENT_CONFIG, scopes=[_GOOGLE_API_GDRIVE_SCOPE])
  flow.redirect_uri = flask.url_for('authorize', _external=True)

  authorization_url, state = flow.authorization_url(
      # Enable incremental authorization. Recommended as a best practice.
      include_granted_scopes='true')
  flask.session['state'] = state

  ggrc_view_to_redirect = flask.request.url
  if flask.request.path == flask.url_for('authorize_gdrive'):
    ggrc_view_to_redirect = flask.request.host_url
  flask.session['ggrc_view_to_redirect'] = ggrc_view_to_redirect

  return flask.redirect(authorization_url)


@app.route('/authorize')
def authorize():
  """Callback used for 2nd step of oauth2 flow"""
  if ('ggrc_view_to_redirect' not in flask.session or
          'state' not in flask.session):
    raise BadRequest(
        "Don't call /authorize directly. It used for authorization callback")

  # Specify the state when creating the flow in the callback so that it can
  # verified in the authorization server response.
  state = flask.session['state']

  flow = google_auth_oauthlib.flow.Flow.from_client_config(
      CLIENT_CONFIG, scopes=[_GOOGLE_API_GDRIVE_SCOPE], state=state)
  flow.redirect_uri = flask.url_for('authorize', _external=True)
  authorization_response = flask.request.url
  flow.fetch_token(authorization_response=authorization_response)

  # Store credentials in the session.
  # ACTION ITEM: To save these credentials in a persistent database instead.
  credentials = flow.credentials
  flask.session['credentials'] = credentials_to_dict(credentials)
  del flask.session['state']
  ggrc_view_to_redirect = flask.session['ggrc_view_to_redirect']
  return flask.redirect(ggrc_view_to_redirect)


def credentials_to_dict(credentials):
  return {
      'token': credentials.token,
      'refresh_token': credentials.refresh_token,
      'token_uri': credentials.token_uri,
      'client_id': credentials.client_id,
      'client_secret': credentials.client_secret,
      'scopes': credentials.scopes
  }
