# Copyright (C) 2017 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Register various listeners needed for snapshot operation"""

from ggrc import models
from ggrc.services import signals
from ggrc.snapshotter import create_snapshots
from ggrc.snapshotter import upsert_snapshots
from ggrc.snapshotter.datastructures import Stub
from ggrc.snapshotter.rules import get_rules


def create_all(sender, obj=None, src=None, service=None, event=None):  # noqa  # pylint: disable=unused-argument
  """Create snapshots"""
  # We use "operation" for non-standard operations (e.g. cloning)
  if not src.get("operation"):
    create_snapshots(obj, event)


def upsert_all(sender, obj=None, src=None, service=None, event=None):  # noqa  # pylint: disable=unused-argument
  """Update snapshots globally"""
  snapshot_settings = src.get("snapshots")
  if snapshot_settings:
    if snapshot_settings["operation"] == "upsert":
      revisions = {
          (Stub.from_dict(revision["parent"]),
           Stub.from_dict(revision["child"])): revision["revision_id"]
          for revision in snapshot_settings.get("revisions", {})}
      upsert_snapshots(obj, event, revisions=revisions)


def register_snapshot_listeners():
  """Attach listeners to various models"""

  rules = get_rules()

  # Initialize listening on parent objects
  for type_ in rules.rules.keys():
    model = getattr(models.all_models, type_)
    signals.Restful.model_posted_after_commit.connect(
        create_all, model, weak=False)
    signals.Restful.model_put_after_commit.connect(
        upsert_all, model, weak=False)
