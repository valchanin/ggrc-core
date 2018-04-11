# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

from ggrc import db
from ggrc.access_control.roleable import Roleable
from ggrc.fulltext.mixin import Indexed
from ggrc.models.comment import Commentable
from .mixins import (BusinessObject, LastDeprecatedTimeboxed,
                     CustomAttributable, TestPlanned)
from .object_document import PublicDocumentable
from .object_person import Personable
from .relationship import Relatable
from .track_object_state import HasObjectState


class Facility(Roleable, HasObjectState, PublicDocumentable,
               CustomAttributable, Personable, Relatable, Commentable,
               TestPlanned, LastDeprecatedTimeboxed, BusinessObject, Indexed,
               db.Model):
  __tablename__ = 'facilities'
  _aliases = {
      "documents_url": None,
      "documents_file": None,
  }
