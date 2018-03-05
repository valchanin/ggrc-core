# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Integration tests for Document"""
from mock import mock

from ggrc.models import all_models
from ggrc.models import exceptions
from integration.ggrc import TestCase
from integration.ggrc.api_helper import Api
from integration.ggrc import generator
from integration.ggrc.models import factories


def dummy_gdrive_response(*args, **kwargs):  # noqa
  return {'webViewLink': 'http://mega.doc',
          'name': 'test_name'}


class TestDocument(TestCase):
  """Document test cases"""

  # pylint: disable=invalid-name

  def setUp(self):
    super(TestDocument, self).setUp()
    self.api = Api()
    self.gen = generator.ObjectGenerator()

  @mock.patch('ggrc.models.document.Document.handle_before_flush',
              lambda x: '')
  def test_get_documentable_obj_assessment_type(self):
    """Test documentable postfix for assessment with one control."""

    control = factories.ControlFactory()
    document = factories.DocumentFactory(
        title='Simple title',
        document_type=all_models.Document.ATTACHMENT,
        documentable_obj={
            'id': control.id,
            'type': 'Control'
        })
    # pylint: disable=protected-access
    self.assertEqual(control, document._get_documentable_obj())

  @mock.patch('ggrc.models.document.Document.handle_before_flush',
              lambda x: '')
  def test_get_documentable_obj_validation_is_id_presents(self):
    """Test documentable _get_documentable_obj validation of id."""
    document = factories.DocumentFactory(
        title='Simple title',
        document_type=all_models.Document.ATTACHMENT,
        documentable_obj={
            'type': 'Control'
        })
    # pylint: disable=protected-access
    with self.assertRaises(exceptions.ValidationError):
      document._get_documentable_obj()

  @mock.patch('ggrc.models.document.Document.handle_before_flush',
              lambda x: '')
  def test_get_documentable_obj_validation_is_type_presents(self):
    """Test documentable _get_documentable_obj validation of type."""
    control = factories.ControlFactory()

    document = factories.DocumentFactory(
        title='Simple title',
        document_type=all_models.Document.ATTACHMENT,
        documentable_obj={
            'id': control.id
        })
    # pylint: disable=protected-access
    with self.assertRaises(exceptions.ValidationError):
      document._get_documentable_obj()

  @mock.patch('ggrc.models.document.Document.handle_before_flush',
              lambda x: '')
  def test_get_documentable_obj_validation_wrong_type(self):
    """Test documentable _get_documentable_obj validation of type."""
    control = factories.ControlFactory()

    document = factories.DocumentFactory(
        title='Simple title',
        document_type=all_models.Document.ATTACHMENT,
        documentable_obj={
            'id': control.id,
            'type': 'Program'
        })
    # pylint: disable=protected-access
    with self.assertRaises(exceptions.ValidationError):
      document._get_documentable_obj()

  @mock.patch('ggrc.models.document.Document.handle_before_flush',
              lambda x: '')
  def test_documentable_postfix_one_control(self):
    """Test documentable postfix for assessment with one control."""

    with factories.single_commit():
      audit = factories.AuditFactory()
      control = factories.ControlFactory()
      snapshot = self._create_snapshots(audit, [control])[0]
      assessment = factories.AssessmentFactory(audit=audit)
      factories.RelationshipFactory(source=assessment, destination=snapshot)

    document = factories.DocumentFactory(
        title='Simple title',
        document_type=all_models.Document.ATTACHMENT,
        documentable_obj={
            'id': assessment.id,
            'type': 'Assessment'
        })

    expected = '_ggrc_assessment-{}_control-{}'.format(assessment.id,
                                                       control.id)
    # pylint: disable=protected-access
    result = document._build_file_name_postfix(assessment)
    self.assertEqual(expected, result)

  @mock.patch('ggrc.models.document.Document.handle_before_flush',
              lambda x: '')
  def test_documentable_postfix_two_controls(self):
    """Test documentable postfix for assessment with two controls."""

    with factories.single_commit():
      audit = factories.AuditFactory()
      control1 = factories.ControlFactory()
      control2 = factories.ControlFactory()
      snapshots = self._create_snapshots(audit, [control1, control2])
      assessment = factories.AssessmentFactory(audit=audit)
      factories.RelationshipFactory(source=assessment,
                                    destination=snapshots[0])
      factories.RelationshipFactory(source=assessment,
                                    destination=snapshots[1])

    document = factories.DocumentFactory(
        title='Simple title',
        document_type=all_models.Document.ATTACHMENT,
        documentable_obj={
            'id': assessment.id,
            'type': 'Assessment'
        })

    expec = '_ggrc_assessment-{}_control-{}_control-{}'.format(assessment.id,
                                                               control1.id,
                                                               control2.id)
    # pylint: disable=protected-access
    result = document._build_file_name_postfix(assessment)
    self.assertEqual(expec, result)

  @mock.patch('ggrc.gdrive.file_actions.process_gdrive_file',
              dummy_gdrive_response)
  def test_copy_document(self):
    """Test copy document."""
    control = factories.ControlFactory()
    factories.DocumentFactory(
        title='Simple title',
        document_type=all_models.Document.ATTACHMENT,
        documentable_obj={
            'id': control.id,
            'type': 'Control'
        })
    self.assertEqual(len(control.documents), 1)
    self.assertEqual(control.document_evidence[0].title, 'test_name')

  def test_rename_document(self):
    """Test rename document."""
    with mock.patch('ggrc.gdrive.file_actions.process_gdrive_file') as mocked:
      mocked.return_value = {
          'webViewLink': 'http://mega.doc',
          'name': 'new_name'
      }
      control = factories.ControlFactory()
      factories.DocumentFactory(
          title='Simple title',
          document_type=all_models.Document.ATTACHMENT,
          is_uploaded=True,
          documentable_obj={
              'id': control.id,
              'type': 'Control'
          })
      folder_id = ''
      mocked.assert_called_with(folder_id, 'some link',
                                '_ggrc_control-{}'.format(control.id),
                                is_uploaded=True,
                                separator='_ggrc')
      self.assertEqual(len(control.documents), 1)
      self.assertEqual(control.document_evidence[0].title, 'new_name')

  def test_update_title(self):
    """Test update document title."""
    create_title = "test_title"
    update_title = "update_test_title"
    document = factories.DocumentFactory(title=create_title)
    response = self.api.put(document, {"title": update_title})
    self.assert200(response)
    self.assertEqual(all_models.Document.query.get(document.id).title,
                     update_title)

  def create_document_by_type(self, doc_type):
    """Create docuemtn with sent type."""
    data = {
        "title": "test_title",
        "link": "test_link",
    }
    if doc_type is not None:
      data["document_type"] = doc_type
    doc_type = doc_type or all_models.Document.URL
    resp, doc = self.gen.generate_object(
        all_models.Document,
        data
    )
    self.assertTrue(
        all_models.Document.query.filter(
            all_models.Document.id == resp.json["document"]["id"],
            all_models.Document.document_type == doc_type,
        ).all()
    )
    return (resp, doc)

  def test_create_url(self):
    """Test create url."""
    self.create_document_by_type(all_models.Document.URL)

  def test_create_url_default(self):
    """Test create url(default)."""
    self.create_document_by_type(None)

  def test_create_evidence(self):
    """Test create evidence."""
    self.create_document_by_type(all_models.Document.ATTACHMENT)

  def test_create_invalid_type(self):
    """Test validation document_type."""
    data = {
        "document_type": 3,
        "title": "test_title",
        "link": "test_link",
        "owners": [self.gen.create_stub(all_models.Person.query.first())],
    }
    obj_name = all_models.Document._inflector.table_singular
    obj = all_models.Document()
    obj_dict = self.gen.obj_to_dict(obj, obj_name)
    obj_dict[obj_name].update(data)
    resp = self.api.post(all_models.Document, obj_dict)
    self.assert400(resp)
    self.assertEqual('"Invalid value for attribute document_type. '
                     'Expected options are `URL`, `EVIDENCE`, '
                     '`REFERENCE_URL`"',
                     resp.data)
