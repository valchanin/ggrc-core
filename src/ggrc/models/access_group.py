# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Module for AccessGroup object"""

from ggrc import db
from ggrc.access_control.roleable import Roleable
from ggrc.models.comment import Commentable
from ggrc.models.mixins import (BusinessObject, LastDeprecatedTimeboxed,
                                CustomAttributable, TestPlanned)
from ggrc.models.object_document import PublicDocumentable
from ggrc.models.object_person import Personable
from ggrc.models.relationship import Relatable
from ggrc.models.track_object_state import HasObjectState
from ggrc.fulltext.mixin import Indexed


class AccessGroup(Roleable, HasObjectState, PublicDocumentable, Commentable,
                  CustomAttributable, Personable, Relatable, TestPlanned,
                  LastDeprecatedTimeboxed, BusinessObject, Indexed, db.Model):
  """Class representing AccessGroup."""

  __tablename__ = 'access_groups'

  _aliases = {
      "documents_url": None,
      "documents_file": None,
  }
