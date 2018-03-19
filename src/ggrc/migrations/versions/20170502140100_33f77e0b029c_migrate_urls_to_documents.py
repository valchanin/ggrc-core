# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""
migrate urls to documents

Create Date: 2017-05-02 14:01:00.127450
"""
# disable Invalid constant name pylint warning for mandatory Alembic variables.
# pylint: disable=invalid-name

from alembic import op
from sqlalchemy import Enum


# revision identifiers, used by Alembic.
revision = '33f77e0b029c'
down_revision = '3aeaadf61cb4'

HYPERLINKED_OBJECTS = {
    'AccessGroup': 'access_groups',
    'Assessment': 'assessments',
    'Audit': 'audits',
    'Clause': 'clauses',
    'Control': 'controls',
    'DataAsset': 'data_assets',
    'Facility': 'facilities',
    'Issue': 'issues',
    'Market': 'markets',
    'Objective': 'objectives',
    'OrgGroup': 'org_groups',
    'Product': 'products',
    'Program': 'programs',
    'Project': 'projects',
    'Section': 'sections',
    'Vendor': 'vendors',

    # polymorphic types (tables containing multiple model types)
    'Directive': 'directives',
    'SystemOrProcess': 'systems',
}

# object types with all polymorphic types (i.e. object types sharing a common
# DB table with other obj types) "expanded"
HYPERLINKED_OBJ_TYPES = (
    set(HYPERLINKED_OBJECTS) -
    {'Directive', 'SystemOrProcess'} |
    {
        'Contract', 'Policy', 'Regulation', 'Standard',  # Directive types
        'System', 'Process'   # SystemOrProcess types
    }
)


def upgrade():
  """Upgrade database schema and/or data, creating a new revision."""
  op.alter_column(
    'documents', 'document_type',
    type_=Enum(u'URL', u'EVIDENCE', u'REFERENCE_URL'),
    existing_type=Enum(u'URL', u'EVIDENCE'),
    nullable=False,
    server_default=u'URL'
  )


def downgrade():
  """Downgrade database schema and/or data back to the previous revision."""
  op.alter_column(
    'documents', 'document_type',
    type_=Enum(u'URL', u'EVIDENCE'),
    existing_type=Enum(u'URL', u'EVIDENCE', u'REFERENCE_URL'),
    nullable=False,
    server_default=u'URL'
  )
