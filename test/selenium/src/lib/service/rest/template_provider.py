# Copyright (C) 2017 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
"""Functionality for work with JSON templates."""
# pylint: disable=too-few-public-methods
# pylint: disable=redefined-builtin
# pylint: disable=invalid-name

import copy
import json
import os


class TemplateProvider(object):
  """Provider of methods for work with JSON templates."""

  @staticmethod
  def generate_template_as_dict(json_tmpl_name, **kwargs):
    """Get template as dictionary from predefined JSON file and attributes
    (items (kwargs): key=value).
    Return dictionary like as {type: {key: value, ...}}.
    """
    json_tmpl_name = json_tmpl_name.lower()
    path = os.path.join(
        os.path.dirname(__file__), "template/{0}.json".format(json_tmpl_name))
    with open(path) as json_file:
      json_data = json_file.read()
    json_tmpl = json.loads(json_data)
    dict()[json_tmpl_name] = json_tmpl
    json_tmpl_copy = copy.deepcopy(json_tmpl)
    json_tmpl_copy.update({k: v for k, v in kwargs.iteritems() if v})
    return {json_tmpl_name: json_tmpl_copy}

  @staticmethod
  def update_template_as_dict(json_tmpl_name, **kwargs):
    """Update template as list of dictionary according to
    attributes (items (kwargs): key=value).
    Return list of dictionary like as [{type: {key: value, ...}}].
    """
    json_tmpl = json.loads(json_tmpl_name)
    type = json_tmpl.iterkeys().next()
    value = json_tmpl.itervalues().next()
    json_tmpl_copy = copy.deepcopy(value)
    json_tmpl_copy.update(kwargs)
    return {type: json_tmpl_copy}
