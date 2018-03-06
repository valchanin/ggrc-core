# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""
Add Evidence model

Create Date: 2018-01-15 07:59:54.664574
"""
# disable Invalid constant name pylint warning for mandatory Alembic variables.
# pylint: disable=invalid-name

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = '207955a2d3c1'
down_revision = '19a260ec358e'


def upgrade():
  """Upgrade database schema and/or data, creating a new revision."""
  op.create_table(
      'evidences',
      sa.Column('id', sa.Integer(), nullable=False),
      sa.Column('link', sa.String(length=250), nullable=False),
      sa.Column('source_gdrive_id', sa.String(length=250), nullable=True),
      sa.Column('description', sa.Text(), nullable=False),
      sa.Column('kind', sa.Enum('URL', 'FILE', 'REFERENCE_URL'),
                nullable=False),
      sa.Column('title', sa.String(length=250), nullable=False),
      sa.Column('slug', sa.String(length=250), nullable=False),
      sa.Column('updated_at', sa.DateTime(), nullable=False),
      sa.Column('modified_by_id', sa.Integer(), nullable=True),
      sa.Column('created_at', sa.DateTime(), nullable=False),
      sa.Column('last_deprecated_date', sa.Date),
      sa.Column('context_id', sa.Integer(), nullable=True),
      sa.Column('status', sa.String(length=250), nullable=False, server_default='Active'),
      sa.ForeignKeyConstraint(['context_id'], ['contexts.id']),
      sa.PrimaryKeyConstraint('id'),
  )
  op.create_index('fk_evidences_contexts', 'evidences',
                  ['context_id'], unique=False)
  op.create_index('ix_evidences_updated_at', 'evidences',
                  ['updated_at'], unique=False)

  sql = """
    INSERT INTO access_control_roles (
        name,
        object_type,
        created_at,
        updated_at,
        mandatory,
        default_to_current_user,
        non_editable
    )
    VALUES (
        'Admin',
        'Evidence',
        NOW(),
        NOW(),
        1,
        1,
        1
    )
  """
  op.execute(sql)

  sql = """
    INSERT INTO access_control_roles (
        name,
        object_type,
        access_control_roles.read,
        access_control_roles.update,
        access_control_roles.delete,
        my_work,
        created_at,
        updated_at,
        non_editable,
        internal
    )
    VALUES (
        'Auditors Evidence Mapped',
        'Evidence',
        1, 1, 0, 0,
        NOW(),
        NOW(),
        1, 1
    ),(
        'Verifiers Evidence Mapped',
        'Assessment',
        1, 1, 1, 1,
        NOW(),
        NOW(),
        1, 1
    ),(
        'Creators Evidence Mapped',
        'Assessment',
        1, 1, 1, 1,
        NOW(),
        NOW(),
        1, 1
    ),(
        'Assignees Evidence Mapped',
        'Assessment',
        1, 1, 1, 1,
        NOW(),
        NOW(),
        1, 1
    )
  """
  op.execute(sql)
  op.execute("""
      DELETE FROM access_control_roles
        WHERE name IN (
            "Auditors Document Mapped",
            "Verifiers Document Mapped",
            "Creators Document Mapped",
            "Assignees Document Mapped"
        )
  """)


def downgrade():
  """Downgrade database schema and/or data back to the previous revision."""
  op.drop_table('evidences')
  op.execute("""
      DELETE FROM access_control_roles
        WHERE object_type = 'Evidence' AND name ='Admin';
  """)
  op.execute("""
      DELETE FROM access_control_roles
        WHERE name IN (
            "Auditors Evidence Mapped",
            "Verifiers Evidence Mapped",
            "Creators Evidence Mapped",
            "Assignees Evidence Mapped"
        )
  """)

  sql = """
    INSERT INTO access_control_roles (
        name,
        object_type,
        access_control_roles.read,
        access_control_roles.update,
        access_control_roles.delete,
        my_work,
        created_at,
        updated_at,
        non_editable,
        internal
    )
    VALUES (
        'Auditors Document Mapped',
        'Evidence',
        1, 1, 0, 0,
        NOW(),
        NOW(),
        1, 1
    ),(
        'Verifiers Document Mapped',
        'Assessment',
        1, 1, 1, 1,
        NOW(),
        NOW(),
        1, 1
    ),(
        'Creators Document Mapped',
        'Assessment',
        1, 1, 1, 1,
        NOW(),
        NOW(),
        1, 1
    ),(
        'Assignees Document Mapped',
        'Assessment',
        1, 1, 1, 1,
        NOW(),
        NOW(),
        1, 1
    )
  """
  op.execute(sql)
#   TODO: check downgrade
