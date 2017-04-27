# Copyright (C) 2017 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""QueryAPI wrapper externally available via Google Cloud Endpoints."""

import endpoints

from ggrc.services.cloud_endpoints import api


def start():
  return endpoints.api_server([api.CloudEndpointsQueryAPI])


__all__ = [
    "start",
]
