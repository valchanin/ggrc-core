# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Module for Objective model."""

from ggrc import db
from ggrc.access_control.roleable import Roleable
from ggrc.fulltext.mixin import Indexed
from ggrc.models.comment import Commentable
from ggrc.models import mixins
from .object_document import PublicDocumentable
from .object_person import Personable
from .audit_object import Auditable
from .track_object_state import HasObjectState
from .relationship import Relatable
from .mixins.with_last_assessment_date import WithLastAssessmentDate
from .mixins.with_similarity_score import WithSimilarityScore


class Objective(WithLastAssessmentDate,
                Roleable,
                HasObjectState,
                mixins.CustomAttributable,
                mixins.WithStartDate,
                mixins.WithLastDeprecatedDate,
                Auditable,
                Relatable,
                Personable,
                PublicDocumentable,
                Commentable,
                mixins.TestPlanned,
                WithSimilarityScore,
                mixins.BusinessObject,
                Indexed,
                db.Model):
  """Class representing Objective."""

  __tablename__ = 'objectives'
  _include_links = []
  _aliases = {
      "documents_url": None,
      "documents_file": None,
  }
