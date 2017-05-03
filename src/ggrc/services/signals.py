# Copyright (C) 2017 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Module for general purpose signaling"""


from blinker import Namespace


class Signals(object):
  """Class storing various general purpose signals

  Class storing various general purpose non-RESTful signals.
  """
  # pylint: disable=too-few-public-methods
  signals = Namespace()

  custom_attribute_changed = signals.signal(
      "Custom Attribute updated",
      """
      Indicates that a custom attribute was successfully saved to database.

        :obj: The model instance
        :value: New custom attribute value
        :service: The instance of model handling the Custom Attribute update
          operation
      """,
  )


class Restful(object):
  """Class storing REST-related signals."""

  signals = Namespace()
  model_posted = signals.signal(
      "Model POSTed",
      """
      Indicates that a model object was received via POST and will be committed
      to the database. The sender in the signal will be the model class of the
      POSTed resource. The following arguments will be sent along with the
      signal:

        :obj: The model instance created from the POSTed JSON.
        :src: The original POSTed JSON dictionary.
        :service: The instance of Resource handling the POST request.
      """,)
  collection_posted = signals.signal(
      "Collection POSTed",
      """
      Indicates that a list of models was received via POST and will be
      committed to the database. The sender in the signal will be the model
      class of the POSTed resource. The following arguments will be sent along
      with the signal:

        :objects: The model instance created from the POSTed JSON.
        :src: The original POSTed JSON dictionary.
        :service: The instance of Resource handling the POST request.
      """,)
  model_posted_after_commit = signals.signal(
      "Model POSTed - after",
      """
      Indicates that a model object was received via POST and has been
      committed to the database. The sender in the signal will be the model
      class of the POSTed resource. The following arguments will be sent along
      with the signal:

        :obj: The model instance created from the POSTed JSON.
        :src: The original POSTed JSON dictionary.
        :service: The instance of Resource handling the POST request.
        :event: Instance of an Event (if change took place) or None otherwise
      """,)
  model_put = signals.signal(
      "Model PUT",
      """
      Indicates that a model object update was received via PUT and will be
      updated in the database. The sender in the signal will be the model class
      of the PUT resource. The following arguments will be sent along with the
      signal:

        :obj: The model instance updated from the PUT JSON.
        :src: The original PUT JSON dictionary.
        :service: The instance of Resource handling the PUT request.
      """,)
  model_put_after_commit = signals.signal(
      "Model PUT - after",
      """
      Indicates that a model object update was received via PUT and has been
      updated in the database. The sender in the signal will be the model class
      of the PUT resource. The following arguments will be sent along with the
      signal:

        :obj: The model instance updated from the PUT JSON.
        :src: The original PUT JSON dictionary.
        :service: The instance of Resource handling the PUT request.
        :event: Instance of an Event (if change took place) or None otherwise
      """,)
  model_deleted = signals.signal(
      "Model DELETEd",
      """
      Indicates that a model object was DELETEd and will be removed from the
      databse. The sender in the signal will be the model class of the DELETEd
      resource. The followin garguments will be sent along with the signal:

        :obj: The model instance removed.
        :service: The instance of Resource handling the DELETE request.
      """,)
  model_deleted_after_commit = signals.signal(
      "Model DELETEd - after",
      """
      Indicates that a model object was DELETEd and has been removed from the
      database. The sender in the signal will be the model class of the DELETEd
      resource. The followin garguments will be sent along with the signal:

        :obj: The model instance removed.
        :service: The instance of Resource handling the DELETE request.
        :event: Instance of an Event (if change took place) or None otherwise
      """,)

