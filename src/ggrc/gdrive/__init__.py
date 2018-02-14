# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""GDrive module"""

import httplib2

import flask
from flask import render_template
from werkzeug.exceptions import Unauthorized

from ggrc import settings
from ggrc.app import app

from oauth2client import client

_GOOGLE_AUTH_URI = "https://accounts.google.com/o/oauth2/auth"
_GOOGLE_TOKEN_URI = "https://accounts.google.com/o/oauth2/token"
_GOOGLE_API_GDRIVE_SCOPE = "https://www.googleapis.com/auth/drive"


def get_http_auth():
  """Get valid user credentials from storage and create an authorized
  http from it.

  If nothing has been stored, or if the stored credentials are invalid,
  the OAuth2 flow is completed to obtain the new credentials.

  Returns:
      http instance authorized with the credentials
  """
  if 'credentials' not in flask.session:
    raise Unauthorized('Unable to get valid credentials')
  try:
    credentials = client.OAuth2Credentials.from_json(
        flask.session['credentials'])
    http_auth = credentials.authorize(httplib2.Http())
    if credentials.access_token_expired:
        credentials.refresh(http_auth)
  except Exception:
    del flask.session['credentials']
    raise Unauthorized('Unable to get valid credentials')

  flask.session['credentials'] = credentials.to_json()
  return http_auth


def is_credential_valid():
  try:
    get_http_auth()
  except Unauthorized:
    return False
  return True


@app.route("/authorize")
def authorize_app():
  """Redirect to Google API auth page to authorize"""
  if is_credential_valid():
    return render_template("gdrive/auth_gdrive.haml")

  flow = client.OAuth2WebServerFlow(
      settings.GAPI_CLIENT_ID,
      settings.GAPI_CLIENT_SECRET,
      scope=_GOOGLE_API_GDRIVE_SCOPE,
      redirect_uri=flask.url_for("authorize_app", _external=True),
      auth_uri=_GOOGLE_AUTH_URI,
      token_uri=_GOOGLE_TOKEN_URI,
  )
  if 'code' not in flask.request.args:
    auth_uri = flow.step1_get_authorize_url()
    return flask.redirect(auth_uri)

  auth_code = flask.request.args["code"]
  credentials = flow.step2_exchange(auth_code)
  flask.session['credentials'] = credentials.to_json()
  return render_template("gdrive/auth_gdrive.haml")
