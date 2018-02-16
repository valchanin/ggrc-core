# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Unit tests for google drive file actions"""

import unittest

import ddt
from mock import mock


@ddt.ddt
class TestFileActions(unittest.TestCase):
  """Tests for utility functions"""
  @mock.patch('ggrc.app.init_views')
  @ddt.data(
      # original_file_name, postfix, expected
      ('orig_file_name', '_ggrc_assessment-1',
       'orig_file_name_ggrc_assessment-1'),
      ('orig_file_name', '_ggrc_', 'orig_file_name_ggrc'),
      ('orig_file_name.doc', '_ggrc_assessment-1',
       'orig_file_name_ggrc_assessment-1.doc'),
      ('orig_f', '_ggrc_assessment-1', 'orig_f_ggrc_assessment-1'),
      ('or*ig_fi/le_name', '_ggrc_assessment-1',
       'or-ig_fi-le_name_ggrc_assessment-1'),
      ('file_ggrc_control-1', '_ggrc_control-1', 'file_ggrc_control-1'),
      ("GGRC's (automation process)_ggrc", '_ggrc_control-2',
       "GGRC's (automation process)_ggrc_control-2"),
  )
  @ddt.unpack
  def test_generate_file_name(self, original_file_name, postfix, expected, _):
    """Test of generate_file_name function

    Copied file name should be alfanumeric + "_ ()-'"
    Copied file name should have postfix e.g (assessment-1)
    Copied file name should have file extension of the original file
    Copied file name should't have 'old' postfix e.g (assessment-1)
    """
    from ggrc.gdrive.file_actions import generate_file_name
    result = generate_file_name(original_file_name, postfix)
    self.assertEquals(expected, result)

  @mock.patch('ggrc.app.init_views')
  @ddt.data(
      # folder_id, file_name, expected
      ('some_folder_id', 'name1', {'name': 'name1',
                                   'parents': ['some_folder_id']}),
      ('', 'name1', {'name': 'name1'}),
  )
  @ddt.unpack
  def test_build_request_body(self, folder_id, file_name, expected, _):
    """Test of _build_request_body function"""
    from ggrc.gdrive.file_actions import _build_request_body
    result = _build_request_body(folder_id, file_name)
    self.assertEquals(expected, result)
