# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""GDrive module"""

from logging import getLogger
import uuid
import httplib2

import flask
from flask import render_template

from oauth2client import client
from oauth2client.client import FlowExchangeError
from werkzeug.exceptions import Unauthorized

from ggrc import settings
from ggrc.app import app
from ggrc.login import login_required


_GOOGLE_AUTH_URI = "https://accounts.google.com/o/oauth2/auth"
_GOOGLE_TOKEN_URI = "https://accounts.google.com/o/oauth2/token"
_GOOGLE_API_GDRIVE_SCOPE = "https://www.googleapis.com/auth/drive"

# pylint: disable=invalid-name
logger = getLogger(__name__)


class GdriveUnauthorized(Unauthorized):
  pass


def get_http_auth():
  """Get valid user credentials from storage and create an authorized
  http from it.

  If nothing has been stored, or if the stored credentials are invalid,
  the OAuth2 flow is completed to obtain the new credentials.

  Returns:
      http instance authorized with the credentials
  """
  if 'credentials' not in flask.session:
    raise GdriveUnauthorized('Unable to get valid credentials')
  try:
    credentials = client.OAuth2Credentials.from_json(
        flask.session['credentials'])
    http_auth = credentials.authorize(httplib2.Http())
  except Exception as ex:
    logger.exception(ex.message)
    del flask.session['credentials']
    raise GdriveUnauthorized('Unable to get valid credentials.')
  flask.session['credentials'] = credentials.to_json()
  return http_auth


def handle_token_error(message=''):
  """Helper method to clean credentials"""
  del flask.session['credentials']
  raise GdriveUnauthorized('Unable to get valid'
                           ' credentials. {}'.format(message))


@app.route("/is_gdrive_authorized")
@login_required
def is_gdrive_authorized():
  """FE need quick check if BE has credentials.

  Unfortunately we can not quick check if credentials are valid here.
  """
  if 'credentials' in flask.session:
    return 'OK'
  else:
    raise GdriveUnauthorized('')


@app.route("/auth_gdrive")
def auth_gdrive():
  """First step of the OAuth2"""
  if 'credentials' in flask.session:
    return render_template('gdrive/auth_gdrive.haml')

  flow = init_flow()
  # to prevent Cross Site Request Forgery we need to send state to google auth
  state = str(uuid.uuid4())
  auth_uri = flow.step1_get_authorize_url(state=state)
  flask.session['state'] = state
  return flask.redirect(auth_uri)


@app.route("/authorize")
def authorize_app():
  """Second step of the OAuth2"""
  if 'code' not in flask.request.args:
    raise Unauthorized('Broken OAuth2 flow, go to /auth_gdrive first')
  # Cross Site Request Forgery (XSRF) guard.
  if flask.request.args['state'] != flask.session['state']:
    raise Unauthorized('Wrong state.')

  flow = init_flow()
  auth_code = flask.request.args['code']
  try:
    credentials = flow.step2_exchange(auth_code)
  except FlowExchangeError as ex:
    logger.exception(ex.message)
    raise Unauthorized('Unable to get token. {}'.format(ex.message))

  flask.session['credentials'] = credentials.to_json()
  return render_template('gdrive/auth_gdrive.haml')


def init_flow():
  return client.OAuth2WebServerFlow(
      settings.GAPI_CLIENT_ID,
      settings.GAPI_CLIENT_SECRET,
      scope=_GOOGLE_API_GDRIVE_SCOPE,
      redirect_uri=flask.url_for('authorize_app', _external=True),
      auth_uri=_GOOGLE_AUTH_URI,
      token_uri=_GOOGLE_TOKEN_URI,
  )
