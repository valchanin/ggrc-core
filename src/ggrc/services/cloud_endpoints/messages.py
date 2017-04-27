# Copyright (C) 2017 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Messages for QueryAPI wrapper for Google Cloud Endpoints."""

import protorpc


class WrappedJSON(protorpc.messages.Message):
  """A message with id and raw JSON body."""

  body = protorpc.messages.StringField(1, required=True)


QueryAPIRequest = WrappedJSON
QueryAPIResponse = WrappedJSON


__all__ = [
    "QueryAPIRequest",
    "QueryAPIResponse",
]
