# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Utils for migration of url and reference url values to documents table"""

from alembic import op
from sqlalchemy import Enum


def migrate_urls_to_documents(_):
  """Move url and reference url values to documents table

  NOTE: This function also included a data migration, but we have removed it
  because of an issue with mysql 5.6 on cloudsql. If for some reason the data
  migration is still needed, please check the git changelog of this file"""
  op.alter_column(
      'documents', 'document_type',
      type_=Enum(u'URL', u'EVIDENCE', u'REFERENCE_URL'),
      existing_type=Enum(u'URL', u'EVIDENCE'),
      nullable=False,
      server_default=u'URL'
  )


def delete_reference_urls(_):
  """Delete reference URL documents and their relations to objects.

  NOTE: This function also included a data migration.
  """
  op.alter_column(
    'documents', 'document_type',
    type_=Enum(u'URL', u'EVIDENCE'),
    existing_type=Enum(u'URL', u'EVIDENCE', u'REFERENCE_URL'),
    nullable=False,
    server_default=u'URL'
  )
