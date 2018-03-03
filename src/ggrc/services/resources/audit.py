# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Custom Resource for Relationship that creates Snapshots when needed.

When Audit-Snapshottable Relationship is POSTed, a Snapshot should be created
instead.
"""
from collections import defaultdict

import sqlalchemy as sa

from werkzeug.exceptions import Forbidden

from ggrc import db
from ggrc import models
from ggrc.utils import benchmark
from ggrc.rbac import permissions
from ggrc.services import common


class AuditResource(common.ExtendedResource):
  """Resource handler for audits."""

  # method post is abstract and not used.
  # pylint: disable=abstract-method

  def get(self, *args, **kwargs):
    # This is to extend the get request for additional data.
    # pylint: disable=arguments-differ
    command_map = {
        None: super(AuditResource, self).get,
        "summary": self.summary_query,
    }
    command = kwargs.pop("command", None)
    if command not in command_map:
      self.not_found_response()
    return command_map[command](*args, **kwargs)

  def summary_query(self, id):
    """Get data for audit summary page."""
    # id name is used as a kw argument and can't be changed here
    # pylint: disable=invalid-name,redefined-builtin
    with benchmark("check audit permissions"):
      audit = models.Audit.query.get(id)
      if not permissions.is_allowed_read_for(audit):
        raise Forbidden()
    with benchmark("Get audit summary data"):
      assessment_evidences = db.session.query(
          models.Assessment.id.label("id"),
          models.Assessment.status.label("status"),
          models.Assessment.verified.label("verified"),
          models.Relationship.destination_id.label("evidence_id"),
          models.Evidence.kind.label("kind")
      ).outerjoin(
          models.Relationship,
          sa.and_(
              models.Relationship.source_id == models.Assessment.id,
              models.Relationship.source_type == "Assessment",
          )
      ).outerjoin(
        models.Evidence,
        models.Evidence.id == models.Relationship.destination_id
      ).filter(
          models.Assessment.audit_id == id,
      ).union_all(
          db.session.query(
              models.Assessment.id.label("id"),
              models.Assessment.status.label("status"),
              models.Assessment.verified.label("verified"),
              models.Relationship.source_id.label("evidence_id"),
              models.Evidence.kind.label("kind")
          ).outerjoin(
              models.Relationship,
              sa.and_(
                  models.Relationship.destination_id == models.Assessment.id,
                  models.Relationship.destination_type == "Assessment",
              )
          ).outerjoin(
            models.Evidence,
            models.Evidence.id == models.Relationship.source_id
          ).filter(
              models.Assessment.audit_id == id,
          )
      )
      statuses_data = defaultdict(lambda: defaultdict(set))
      all_assessment_ids = set()
      all_evidence_ids = set()
      for id_, status, verified, evidence_id, kind in assessment_evidences:
        if id_:
          statuses_data[(status, verified)]["assessments"].add(id_)
          all_assessment_ids.add(id_)
        if evidence_id and kind != models.Evidence.REFERENCE_URL:
          statuses_data[(status, verified)]["evidences"].add(evidence_id)
          all_evidence_ids.add(evidence_id)

    with benchmark("Make response"):
      statuses_json = []
      total = {"assessments": 0, "evidences": 0}
      for (status, verified), data in statuses_data.items():
        statuses_json.append({
            "name": status,
            "verified": verified,
            "assessments": len(data["assessments"]),
            "evidences": len(data["evidences"]),
        })
      total["assessments"] = len(all_assessment_ids)
      total["evidences"] = len(all_evidence_ids)

      statuses_json.sort(key=lambda k: (k["name"], k["verified"]))
      response_object = {"statuses": statuses_json, "total": total}
      return self.json_success_response(response_object, )
