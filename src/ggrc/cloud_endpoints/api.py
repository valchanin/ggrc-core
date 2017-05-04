# Copyright (C) 2017 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""QueryAPI wrapper for Google Cloud Endpoints."""

import json

import endpoints
import flask
import protorpc

from ggrc.cloud_endpoints import messages
from ggrc import settings
from ggrc.utils import as_json


def get_endpoints_current_user(raise_unauthorized=True):
  """Return the current user and (optionally) causes an HTTP 401 if no user.

  Args:
    raise_unauthorized (bool): If True, raise an exception which causes
        HTTP 401 Unauthorized to be returned with the request.

  Returns:
    The user signed in if a user is signed in,
    None if not and raise_unauthorized is False.

  Raises:
    endpoints.UnauthorizedException if no user is signed in and
    raise_unauthorized is True.
  """
  current_user = endpoints.get_current_user()
  if raise_unauthorized and current_user is None:
    raise endpoints.UnauthorizedException('Invalid token.')
  return current_user


def _get_client_ids():
  client_ids = getattr(settings, "ALLOWED_CLOUD_ENDPOINTS_CLIENT_IDS", [])
  if getattr(settings, "DEBUG", False):
    client_ids += [endpoints.API_EXPLORER_CLIENT_ID]
  return client_ids


@endpoints.api(
    name="QueryAPI",
    version="v1",
    allowed_client_ids=_get_client_ids(),
    auth_level=endpoints.AUTH_LEVEL.REQUIRED,
)
class CloudEndpointsQueryAPI(protorpc.remote.Service):
  """GCE service to wrap QueryAPI."""

  # pylint: disable=no-self-use
  @endpoints.method(
      messages.QueryAPIRequest,
      messages.QueryAPIResponse,
      path="QueryAPI",
      http_method="POST",
      name="QueryAPI.query",
  )
  def query(self, request):
    """Wrap QueryAPI service into GCE method."""
    query = json.loads(request.body)

    from ggrc import app
    from ggrc.models.person import Person
    from ggrc.services.query_helper import QueryAPIQueryHelper

    with app.app.app_context():
      ge_user = get_endpoints_current_user(raise_unauthorized=True)
      db_user = Person.query.filter_by(email=ge_user.email()).first()
      if not db_user:
        raise endpoints.UnauthorizedException()

      flask.g.user = db_user

      query_helper = QueryAPIQueryHelper(query)
      results = query_helper.get_results()

    collections = []
    collection_fields = ["ids", "values", "count", "total"]

    for result in results:
      collection = {
          result["object_name"]: {
              field: result[field]
              for field in collection_fields
              if field in result
          }
      }
      collections.append(collection)

    return messages.QueryAPIResponse(body=as_json(collections))


__all__ = [
    "CloudEndpointsQueryAPI",
]
