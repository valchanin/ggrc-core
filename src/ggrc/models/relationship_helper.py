# Copyright (C) 2015 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: miha@reciprocitylabs.com
# Maintained By: miha@reciprocitylabs.com


from sqlalchemy import and_

from ggrc import db
from ggrc.models.relationship import Relationship


class RelationshipHelper(object):

  @classmethod
  def get_ids_related_to(cls, object_type, related_type, related_ids=[]):
    """ get ids of objects

    Get a list of all ids for object with object_type, that are related to any
    of the objects with type related_type and id in related_ids
    """
    if isinstance(related_ids, (int, long)):
      related_ids = [related_ids]

    destination_ids = db.session.query(Relationship.destination_id).filter(
        and_(
            Relationship.destination_type == object_type,
            Relationship.source_type == related_type,
            Relationship.source_id.in_(related_ids),
        )
    )
    source_ids = db.session.query(Relationship.source_id).filter(
        and_(
            Relationship.source_type == object_type,
            Relationship.destination_type == related_type,
            Relationship.destination_id.in_(related_ids),
        )
    )
    return source_ids.union(destination_ids)
