from mock import mock

from ggrc.models import all_models
from integration.ggrc import TestCase
from integration.ggrc.models import factories

COPIED_TITLE = 'test_name'


def dummy_gdrive_response(*args):  # noqa
  return {'webViewLink': 'http://mega.doc',
          'name': COPIED_TITLE}


class TestWithEvidence(TestCase):

  @mock.patch('ggrc.gdrive.file_actions.copy_file', dummy_gdrive_response)
  def test_evidences(self):
    """Test related evidences"""

    audit = factories.AuditFactory()
    factories.EvidenceFactory(
      title='Simple title',
      evidence_type=all_models.Evidence.GDRIVE_FILE,
      parent_obj={
        'id': audit.id,
        'type': audit.type
      })

    self.assertEqual(len(audit.evidences), 1)
    self.assertEqual(audit.evidences[0].title, COPIED_TITLE)

  @mock.patch('ggrc.gdrive.file_actions.copy_file', dummy_gdrive_response)
  def test_evidevce_type(self):
    """Test related evidences"""

    audit = factories.AuditFactory()
    factories.EvidenceFactory(
      title='Simple title1',
      evidence_type=all_models.Evidence.GDRIVE_FILE,
      parent_obj={
        'id': audit.id,
        'type': audit.type
      })

    factories.EvidenceFactory(
      title='Simple title2',
      evidence_type=all_models.Evidence.URL,
      parent_obj={
        'id': audit.id,
        'type': audit.type
      })

    factories.EvidenceFactory(
      title='Simple title3',
      evidence_type=all_models.Evidence.REFERENCE_URL,
      parent_obj={
        'id': audit.id,
        'type': audit.type
      })

    self.assertEqual(len(audit.evidences), 3)
    self.assertEqual(len(audit.evidences_url), 1)
    self.assertEqual(len(audit.evidences_gdrive_file), 1)
    self.assertEqual(len(audit.evidences_reference_url), 1)
