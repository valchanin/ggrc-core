# Copyright (C) 2017 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""
Add index on access_control_list

Create Date: 2017-05-17 16:28:18.428357
"""
# disable Invalid constant name pylint warning for mandatory Alembic variables.
# pylint: disable=invalid-name

from alembic import op

# revision identifiers, used by Alembic.
revision = '59a7bd61e36a'
down_revision = '1ac595e94a23'


def upgrade():
  """Upgrade database schema and/or data, creating a new revision."""
  op.create_index('idx_object_type_object_idx',
                  'access_control_list',
                  ['object_type', 'object_id'])


def downgrade():
  """Downgrade database schema and/or data back to the previous revision."""
  op.drop_index('idx_object_type_object_idx', table_name='access_control_list')
