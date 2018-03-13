# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""
migration of documents of Evidence type with multiple relationships

Create Date: 2018-03-13 16:07:01.572691
"""
# disable Invalid constant name pylint warning for mandatory Alembic variables.
# pylint: disable=invalid-name
import json
from itertools import groupby

import datetime
from sqlalchemy.sql import text
from alembic import op


# revision identifiers, used by Alembic.
from ggrc.migrations.utils.migrator import get_migration_user_id

revision = '48a49f384b2e'
down_revision = 'd1671a8dac7'


def last_insert_id(connection):
  return connection.execute(text('select LAST_INSERT_ID()')).fetchone()[0]


def copy_doc(connection, old_doc):
  """Create copy of document object and return it's id"""
  (_, doc_type, modified_by_id, title,
   link, description, context_id, _, _, _) = old_doc
  sql = """
      INSERT INTO documents (
        modified_by_id,
        created_at,
        updated_at,
        title,
        link,
        description,
        context_id,
        document_type)
      VALUES (:modified_by_id, NOW(), NOW(), :title, :link,
              :description, :context_id, :document_type)
      """
  connection.execute(text(sql),
                     modified_by_id=modified_by_id,
                     title=title,
                     link=link,
                     description=description,
                     context_id=context_id,
                     document_type=doc_type)
  new_doc_id = last_insert_id(connection)
  return new_doc_id


def copy_acl(connection, acl, new_id):
  """Create copy of ACL object"""
  (_, person_id, ac_role_id, _, object_type,
   modified_by_id, context_id, parent_id) = acl
  sql = """
      INSERT INTO access_control_list (
        person_id,
        ac_role_id,
        object_id,
        object_type,
        modified_by_id,
        context_id,
        parent_id,
        created_at,
        updated_at)
      VALUES (:person_id, :ac_role_id, :new_id, :object_type,
              :modified_by_id, :context_id, :parent_id, NOW(), NOW())
  """
  connection.execute(text(sql),
                     person_id=person_id,
                     ac_role_id=ac_role_id,
                     new_id=new_id,
                     object_type=object_type,
                     modified_by_id=modified_by_id,
                     context_id=context_id,
                     parent_id=parent_id)


def is_valid_role(connection, document_id, parent_id):
  """Check if given user role is valid for the document."""
  sql = """
  SELECT count(1)
    FROM access_control_list acl
    JOIN relationships r ON
         r.source_id=acl.object_id AND
         r.source_type = acl.object_type AND
         destination_id = :doc_id AND
         destination_type = 'Document'
    WHERE acl.id=:parent_id
  """
  result = connection.execute(text(sql),
                              doc_id=document_id,
                              parent_id=parent_id
                              ).fetchone()[0]
  return bool(result)


def delete_acl(connection, acl_id):
  """Delete ACL by id"""
  connection.execute(text('DELETE from access_control_list where id=:acl_id'),
                     acl_id=acl_id)


def copy_acls(connection, old_doc_id, new_doc_id):
  """Copy ACL to new document

  During this process checks if role related to document and
  removes unnecessary roles from a copied document.

  Before the coping:
  assessment_1\
                d (acl_a1, acl_a2)
  assessment_2/

  After the coping:
  assessment_1 - d (acl_a1)

  assessment_2 - d'(acl_a2)
  """
  results = connection.execute(text(
      """
      SELECT
        acl.id,
        acl.person_id,
        acl.ac_role_id,
        acl.object_id,
        acl.object_type,
        acl.modified_by_id,
        acl.context_id,
        acl.parent_id
      FROM access_control_list acl
      JOIN access_control_roles acr ON
           acl.ac_role_id=acr.id
      WHERE acl.object_type='Document' AND acl.object_id=:old_doc_id
      """), old_doc_id=old_doc_id).fetchall()
  for item in results:
    acl_id, _, _, _, _, _, _, parent_id = item
    if not parent_id:
      copy_acl(connection, item, new_doc_id)
    else:
      if is_valid_role(connection, new_doc_id, parent_id):
        copy_acl(connection, item, new_doc_id)
        delete_acl(connection, acl_id)


def get_last_revision(connection, old_document_id):
  """Returns last revision for the document"""
  sql = """
      SELECT
        content,
        context_id,
        modified_by_id,
        source_type,
        source_id,
        destination_type,
        destination_id,
        resource_slug
      FROM revisions
      WHERE resource_type='Document' AND
            resource_id=:old_document_id
      ORDER BY updated_at LIMIT 1
  """
  result = connection.execute(text(sql),
                              old_document_id=old_document_id).fetchone()
  return result


def update_content(content, new_doc_id):
  """Updates revision content"""
  content['id'] = new_doc_id
  now = datetime.datetime.now().strftime('%Y-%m-%dT%H:%M:%S')
  content['created_at'] = content['updated_at'] = now


def create_doc_revision(connection, old_document_id,
                        new_doc_id, event_id, user_id):
  """Creates new revision base on last revision of copied document."""
  last_revision = get_last_revision(connection, old_document_id)
  content = last_revision[0]
  content = json.loads(content)
  update_content(content, new_doc_id)
  (_, context_id, _, _, _, _, _, resource_slug) = last_revision
  sql = """
      INSERT INTO revisions (
        resource_id,
        resource_type,
        event_id,
        action,
        content,
        context_id,
        created_at,
        updated_at,
        modified_by_id,
        resource_slug)
      VALUES (:new_doc_id, "Document", :event_id, "created",
              :content, :context_id, NOW(), NOW(), :user_id, :resource_slug);
  """
  connection.execute(
      text(sql),
      new_doc_id=new_doc_id, event_id=event_id,
      content=json.dumps(content, ensure_ascii=False),
      context_id=context_id,
      user_id=user_id, resource_slug=resource_slug
  )


def create_new_relationship(connection, source_id, source_type, doc_id):
  """Create relationship for new document"""
  sql = """
      INSERT INTO relationships (
        source_id,
        source_type,
        destination_id,
        destination_type,
        created_at,
        updated_at,
        is_external)
      VALUES (:source_id, :source_type, :doc_id,
              'Document', NOW(), NOW(), '0');
  """
  connection.execute(text(sql),
                     source_id=source_id,
                     source_type=source_type,
                     doc_id=doc_id)
  inserted_id = last_insert_id(connection)
  return inserted_id


def delete_relationship(connection, relationship_id):
  """Delete relationship"""
  connection.execute(text('DELETE from relationships '
                          'where id=:relationship_id'),
                     relationship_id=relationship_id)


def create_rel_revision_content(rev_id, source_type,
                                source_id, destination_id):
  """Create content for new revision"""
  now = datetime.datetime.now().strftime('%Y-%m-%dT%H:%M:%S')

  content = {
      "parent_id": None,
      "context_id": None,
      "modified_by_id": None,
      "automapping_id": None,
      "modified_by": None,
      "type": "Relationship",
      'display_name': "{}:{} <-> Document:{}".format(source_type,
                                                     source_id,
                                                     destination_id),
      'created_at': now,
      'updated_at': now,
      'source_type': source_type,
      'source_id': source_id,
      'destination_type': 'Document',
      'destination_id': destination_id, 'id': rev_id
  }

  return content


# pylint: disable=too-many-arguments
def create_rel_revision(connection, rel_id, event_id,
                        source_type, source_id, destination_id, user_id):
  """Create revision for relationship"""
  content = create_rel_revision_content(rel_id, source_type,
                                        source_id, destination_id)

  sql = """
      INSERT INTO revisions (
        resource_id,
        resource_type,
        event_id,
        action,
        content,
        created_at,
        updated_at,
        modified_by_id,
        source_type,
        source_id,
        destination_type,
        destination_id)
      VALUES (:rel_id, 'Relationship', :event_id,
              'created', :content, NOW(), NOW(),
              :modified_by_id, :source_type,
              :source_id, 'Document', :destination_id);
  """
  connection.execute(
      text(sql),
      rel_id=rel_id,
      event_id=event_id,
      content=json.dumps(content, ensure_ascii=False),
      modified_by_id=user_id,
      source_type=source_type,
      source_id=source_id,
      destination_id=destination_id
  )


# pylint: disable=too-many-locals
def process_group(connection, gr, event_id, user_id):
  """Process group of documents, relationships (grouped bt document.id)"""
  all_items = list(gr)
  # we need to process documents that will became Evidence type
  audit_assess_items = [i for i in all_items if i.counterparty_type
                        in ('Audit', 'Assessment')]
  is_non_audit_assess_items = len(all_items) > len(audit_assess_items)

  start_index = 1
  if is_non_audit_assess_items:
    start_index = 0
  for item in audit_assess_items[start_index:]:
    old_document_id = item.doc_id
    relationship_id = item.rel_id
    counterparty_id = item.counterparty_id
    counterparty_type = item.counterparty_type

    new_doc_id = copy_doc(connection, item)
    create_doc_revision(connection, old_document_id,
                        new_doc_id, event_id, user_id)

    inserted_rel_id = create_new_relationship(connection, counterparty_id,
                                              counterparty_type, new_doc_id)
    create_rel_revision(connection,
                        inserted_rel_id,
                        event_id,
                        counterparty_type,
                        counterparty_id,
                        new_doc_id,
                        user_id)

    delete_relationship(connection, relationship_id)
    copy_acls(connection, old_document_id, new_doc_id)


def crete_event_for_revision(connection, user_id):
  """Create event for BULK document creation"""
  sql = """
      INSERT INTO events (
          modified_by_id,
          created_at,
          action,
          resource_type,
          updated_at)
      VALUES (:user_id, NOW(), 'BULK', 'Document', NOW());
  """
  connection.execute(text(sql), user_id=user_id)
  event_id = last_insert_id(connection)
  return event_id


def list_docs_with_multiple_relationships(connection):
  """Returns list of document id's with have multiple relationships"""
  sql = """
      SELECT doc_id from(
        SELECT
          d.id as doc_id, r.id as rel_id
        FROM
          documents as d
        JOIN relationships as r
          ON r.destination_id = d.id
        WHERE
          r.destination_type = 'Document' AND
          d.document_type in ('EVIDENCE', 'URL')
        UNION ALL
        SELECT
          d.id as doc_id, r.id as rel_id
        FROM
          documents as d
        JOIN relationships as r
          ON r.source_id = d.id
        WHERE
          r.source_type = 'Document' AND
          d.document_type in ('EVIDENCE', 'URL')
      ) as doc_ids GROUP BY doc_id HAVING COUNT(rel_id) > 1
  """
  return [str(r.doc_id) for r in connection.execute(text(sql)).fetchall()]


def get_docs_to_process(connection, document_ids):
  """Returns list of data to process.

  Data contains document and it's counterparty (bidirectional) information.
  """
  sql = """
    SELECT *
      FROM (
        SELECT
          d.id as doc_id,
          d.document_type,
          d.modified_by_id,
          d.title,
          d.link,
          d.description,
          d.context_id,
          r.id as rel_id,
          r.source_id as counterparty_id,
          r.source_type as counterparty_type
        FROM
          documents d
        JOIN relationships r
          ON r.destination_id = d.id
        WHERE
          r.destination_type = 'Document' AND
          d.id IN :document_ids
        UNION ALL
        SELECT
          d.id as doc_id,
          d.document_type,
          d.modified_by_id,
          d.title,
          d.link,
          d.description,
          d.context_id,
          r.id as rel_id,
          r.destination_id as counterparty_id,
          r.destination_type as counterparty_type
        FROM
          documents d
        JOIN relationships r
          ON r.source_id = d.id
        WHERE
          r.source_type = 'Document' AND
          d.id IN :document_ids
    ) as ut ORDER BY doc_id;
  """
  return connection.execute(text(sql),
                            document_ids=document_ids).fetchall()


def run_migration():
  """Run main migration flow"""
  connection = op.get_bind()
  multi_rel_document_ids = list_docs_with_multiple_relationships(connection)
  if multi_rel_document_ids:
    migration_user_id = get_migration_user_id(connection)
    event_id = crete_event_for_revision(connection, migration_user_id)
    docs_to_process = get_docs_to_process(connection, multi_rel_document_ids)
    # group documents by id
    for _, group in groupby(docs_to_process, lambda it: it.doc_id):
      process_group(connection, group, event_id, migration_user_id)


def alter_documents_table():
  """We need to add additional column to document used in document epic"""
  op.execute("ALTER TABLE documents ADD "
             "source_gdrive_id varchar(250) DEFAULT NULL")


def upgrade():
  """Upgrade database schema and/or data, creating a new revision."""
  run_migration()
  alter_documents_table()


def downgrade():
  """Downgrade database schema and/or data back to the previous revision."""
  op.execute("ALTER TABLE documents DROP COLUMN source_gdrive_id")
