# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Tests for GDrive integration."""

import unittest
import mock

import ddt

from ggrc.gdrive import file_actions


@ddt.ddt
class TestGetGDRiveFile(unittest.TestCase):
  """Test getter info from GDrive."""

  CSV_DATA = ('Object_tyle,Code*,Title*,LIST*\n'
              ',OBJ-1185,OBJ_title,"user1\nuser2"')

  @ddt.data(
      {"id": "123123", "mimeType": "text/csv"},
      {"id": "123123"},
  )
  @mock.patch("ggrc.gdrive.file_actions.get_http_auth")
  @mock.patch("ggrc.gdrive.file_actions.discovery")
  def test_getter_csv(self, file_data, disco_mock, auth_mock):
    """Test getter csv data over GDrive."""
    disco_files = disco_mock.build.return_value.files.return_value
    disco_files.get.return_value.execute.return_value = file_data
    if "mimeType" in file_data:
      data_getter = disco_files.get_media.return_value.execute
    else:
      data_getter = disco_files.export_media.return_value.execute
    data_getter.return_value = self.CSV_DATA
    self.assertEqual(
        [[u'Object_tyle', u'Code*', u'Title*', u'LIST*'],
         [u'', u'OBJ-1185', u'OBJ_title', u'user1\nuser2']],
        file_actions.get_gdrive_file(file_data))
    auth_mock.assert_called_once_with()
    disco_mock.build.assert_called_once_with("drive",
                                             "v3",
                                             http=auth_mock.return_value)
    disco_files.get.assert_called_once_with(fileId=file_data["id"])
