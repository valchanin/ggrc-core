# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Integration test for WithAutoDeprecation mixin"""
from ggrc.models import all_models
from integration.ggrc import TestCase, api_helper
from integration.ggrc.models import factories


class TestEvidenceAutoDeprecation(TestCase):
  """Test case for Evidence status update to DEPRECATED"""

  def setUp(self):
    super(TestEvidenceAutoDeprecation, self).setUp()
    self.client.get("/login")
    self.api_helper = api_helper.Api()

  def test_audit_unmapping(self):
    """Unmap Evidence from Audit -> evidence.DEPRECATED"""
    with factories.single_commit():
      audit = factories.AuditFactory()
      evidence = factories.EvidenceUrlFactory(
          parent_obj={
              'id': audit.id,
              'type': 'Audit'
          }
      )
    self.assertEquals(evidence.START_STATE, evidence.status)
    relationship = all_models.Relationship.query.filter(
        all_models.Relationship.destination_id == evidence.id,
        all_models.Relationship.source_id == audit.id
    ).one()
    self.api_helper.delete(relationship)
    evidence = self.refresh_object(evidence)
    self.assertEquals(evidence.DEPRECATED, evidence.status)

  def test_assessment_unmapping(self):
    """Unmap Evidence from Assessment -> evidence.DEPRECATED"""
    with factories.single_commit():
      assessment = factories.AssessmentFactory()
      evidence = factories.EvidenceUrlFactory(
          parent_obj={
              'id': assessment.id,
              'type': 'Assessment'
          }
      )
    self.assertEquals(evidence.START_STATE, evidence.status)
    relationship = all_models.Relationship.query.filter(
        all_models.Relationship.destination_id == evidence.id,
        all_models.Relationship.source_id == assessment.id
    ).one()
    self.api_helper.delete(relationship)
    evidence = self.refresh_object(evidence)
    self.assertEquals(evidence.DEPRECATED, evidence.status)
