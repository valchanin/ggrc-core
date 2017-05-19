# Copyright (C) 2017 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
"""Factories that create entities."""
# pylint: disable=too-many-arguments
# pylint: disable=invalid-name
# pylint: disable=redefined-builtin


import copy
import random

import re
from lib.constants import element, objects, roles, url as const_url
from lib.constants.element import AdminWidgetCustomAttributes
from lib.entities import entity
from lib.utils import string_utils
from lib.utils.string_utils import (random_list_strings, random_string,
                                    random_uuid)


class EntitiesFactory(object):
  """Common factory class for entities."""
  # pylint: disable=too-few-public-methods
  obj_person = objects.get_singular(objects.PEOPLE, title=True)
  obj_program = objects.get_singular(objects.PROGRAMS, title=True)
  obj_control = objects.get_singular(objects.CONTROLS, title=True)
  obj_audit = objects.get_singular(objects.AUDITS, title=True)
  obj_asmt_tmpl = objects.get_singular(objects.ASSESSMENT_TEMPLATES,
                                       title=True)
  obj_asmt = objects.get_singular(objects.ASSESSMENTS, title=True)
  obj_issue = objects.get_singular(objects.ISSUES, title=True)
  obj_ca = objects.get_singular(objects.CUSTOM_ATTRIBUTES)

  all_objs_attrs_names = tuple(entity.Entity().attrs_names_all_entities())

  @classmethod
  def update_obj_attrs_values(cls, obj, attrs_names=all_objs_attrs_names,
                              **arguments):
    """Update object's (obj) attributes values according to list of
    unique possible objects' names and dictionary of arguments (key = value).
    """
    # pylint: disable=expression-not-assigned
    [setattr(obj, attr_name, arguments[attr_name]) for
        attr_name in attrs_names if arguments.get(attr_name)]
    return obj

  @classmethod
  def generate_string(cls, first_part):
    """Generate string according object type and random data."""
    special_chars = string_utils.SPECIAL
    return "{first_part}_{uuid}_{rand_str}".format(
        first_part=first_part, uuid=random_uuid(),
        rand_str=random_string(size=len(special_chars), chars=special_chars))

  @classmethod
  def generate_slug(cls):
    """Generate slug according str part and random data."""
    return "{slug}".format(slug=random_uuid())

  @classmethod
  def generate_email(cls, domain=const_url.DEFAULT_EMAIL_DOMAIN):
    """Generate email according domain."""
    return "{mail_name}@{domain}".format(
        mail_name=random_uuid(), domain=domain)


class ObjectOwnersFactory(EntitiesFactory):
  """Factory class for Persons entities."""

  @classmethod
  def default(cls):
    """Create default system Person object."""
    return cls.create(
        name=roles.DEFAULT_USER, id=1, href=const_url.DEFAULT_USER_HREF,
        email=const_url.DEFAULT_USER_EMAIL, system_wide_role=roles.SUPERUSER)

  @classmethod
  def create(cls, type=None, id=None, name=None, href=None, url=None,
             email=None, company=None, system_wide_role=None, updated_at=None,
             custom_attribute_definitions=None,
             custom_attribute_values=None):
    """Create Person object.
    Random values will be used for name.
    Predictable values will be used for type, email and system_wide_role.
    """
    person_entity = cls._create_random_person()
    person_entity = cls.update_obj_attrs_values(
        obj=person_entity, type=type, id=id, name=name, href=href, url=url,
        email=email, company=company, system_wide_role=system_wide_role,
        updated_at=updated_at,
        custom_attribute_definitions=custom_attribute_definitions,
        custom_attribute_values=custom_attribute_values)
    return person_entity

  @classmethod
  def _create_random_person(cls):
    """Create Person entity with randomly filled fields."""
    random_person = entity.PersonEntity()
    random_person.type = cls.obj_person
    random_person.name = cls.generate_string(cls.obj_person)
    random_person.email = cls.generate_email()
    random_person.system_wide_role = roles.SUPERUSER
    return random_person


class CustomAttributeDefinitionsFactory(EntitiesFactory):
  """Factory class for  entities."""

  @classmethod
  def create(cls, title=None, id=None, href=None, type=None,
             definition_type=None, attribute_type=None, helptext=None,
             placeholder=None, mandatory=None, multi_choice_options=None):
    """Create Custom Attribute object. CA object attribute 'definition_type'
    is used as default for REST operations e.g. 'risk_assessment', for UI
    operations need convert to normal form used method objects.get_normal_form
    e.q. 'Risk Assessments'.
    Random values will be used for title, attribute_type, definition_type and
    multi_choice_options if randomly generated attribute_type is 'Dropdown'.
    """
    ca_entity = cls._create_random_ca()
    ca_entity = cls._update_ca_attrs_values(
        obj=ca_entity, title=title, id=id, href=href, type=type,
        definition_type=definition_type, attribute_type=attribute_type,
        helptext=helptext, placeholder=placeholder, mandatory=mandatory,
        multi_choice_options=multi_choice_options)
    return ca_entity

  @classmethod
  def _create_random_ca(cls):
    """Create CustomAttribute entity with randomly filled fields."""
    random_ca = entity.CustomAttributeEntity()
    random_ca.type = cls.obj_ca
    random_ca.attribute_type = random.choice(
        AdminWidgetCustomAttributes.ALL_CA_TYPES)
    random_ca.title = cls.generate_string(random_ca.attribute_type)
    if random_ca.attribute_type == AdminWidgetCustomAttributes.DROPDOWN:
      random_ca.multi_choice_options = random_list_strings()
    random_ca.definition_type = objects.get_singular(
        random.choice(objects.ALL_CA_OBJS))
    random_ca.mandatory = False
    return random_ca

  @classmethod
  def _update_ca_attrs_values(cls, obj, **arguments):
    """Update CA's (obj) attributes values according to dictionary of
    arguments (key = value). Restrictions: 'multi_choice_options' is a
    mandatory attribute for Dropdown CA and 'placeholder' is a attribute that
    exists only for Text and Rich Text CA.
    Generated data - 'obj', entered data - '**arguments'.
    """
    # fix generated data
    if arguments.get("attribute_type"):
      obj.title = cls.generate_string(arguments["attribute_type"])
    if (obj.multi_choice_options and
            obj.attribute_type == AdminWidgetCustomAttributes.DROPDOWN and
            arguments.get("attribute_type") !=
            AdminWidgetCustomAttributes.DROPDOWN):
      obj.multi_choice_options = None
    # fix entered data
    if (arguments.get("multi_choice_options") and
            arguments.get("attribute_type") !=
            AdminWidgetCustomAttributes.DROPDOWN):
      arguments["multi_choice_options"] = None
    if (arguments.get("placeholder") and arguments.get("attribute_type") not in
        (AdminWidgetCustomAttributes.TEXT,
         AdminWidgetCustomAttributes.RICH_TEXT)):
      arguments["placeholder"] = None
    # extend entered data
    if (arguments.get("attribute_type") ==
            AdminWidgetCustomAttributes.DROPDOWN and not
            obj.multi_choice_options):
      obj.multi_choice_options = random_list_strings()
    return cls.update_obj_attrs_values(obj=obj, **arguments)


class ProgramsFactory(EntitiesFactory):
  """Factory class for Programs entities."""

  @classmethod
  def create_empty(cls):
    """Create blank Program object."""
    empty_program = entity.ProgramEntity()
    empty_program.type = cls.obj_program
    return empty_program

  @classmethod
  def create(cls, type=None, id=None, title=None, href=None, url=None,
             slug=None, status=None, manager=None, contact=None,
             secondary_contact=None, updated_at=None,
             custom_attribute_definitions=None, custom_attribute_values=None):
    """Create Program object.
    Random values will be used for title and slug.
    Predictable values will be used for type, status, manager, contact.
    """
    program_entity = cls._create_random_program()
    program_entity = cls.update_obj_attrs_values(
        obj=program_entity, type=type, id=id, title=title, href=href, url=url,
        slug=slug, status=status, manager=manager, contact=contact,
        secondary_contact=secondary_contact, updated_at=updated_at,
        custom_attribute_definitions=custom_attribute_definitions,
        custom_attribute_values=custom_attribute_values)
    return program_entity

  @classmethod
  def _create_random_program(cls):
    """Create Program entity with randomly and predictably filled fields."""
    random_program = entity.ProgramEntity()
    random_program.type = cls.obj_program
    random_program.title = cls.generate_string(cls.obj_program)
    random_program.slug = cls.generate_slug()
    random_program.status = element.ObjectStates.DRAFT
    random_program.manager = ObjectOwnersFactory().default().__dict__
    random_program.contact = ObjectOwnersFactory().default().__dict__
    return random_program


class ControlsFactory(EntitiesFactory):
  """Factory class for Controls entities."""

  @classmethod
  def create_empty(cls):
    """Create blank Control object."""
    empty_control = entity.ControlEntity()
    empty_control.type = cls.obj_control
    return empty_control

  @classmethod
  def create(cls, type=None, id=None, title=None, href=None, url=None,
             slug=None, status=None, owners=None, contact=None,
             secondary_contact=None, updated_at=None,
             custom_attribute_definitions=None, custom_attribute_values=None):
    """Create Control object.
    Random values will be used for title and slug.
    Predictable values will be used for type, status, owners and contact.
    """
    control_entity = cls._create_random_control()
    control_entity = cls.update_obj_attrs_values(
        obj=control_entity, type=type, id=id, title=title, href=href, url=url,
        slug=slug, status=status, owners=owners, contact=contact,
        secondary_contact=secondary_contact, updated_at=updated_at,
        custom_attribute_definitions=custom_attribute_definitions,
        custom_attribute_values=custom_attribute_values)
    return control_entity

  @classmethod
  def _create_random_control(cls):
    """Create Control entity with randomly and predictably filled fields."""
    random_control = entity.ControlEntity()
    random_control.type = cls.obj_control
    random_control.title = cls.generate_string(cls.obj_control)
    random_control.slug = cls.generate_slug()
    random_control.status = element.ObjectStates.DRAFT
    random_control.contact = ObjectOwnersFactory().default().__dict__
    random_control.owners = [ObjectOwnersFactory().default().__dict__]
    return random_control


class AuditsFactory(EntitiesFactory):
  """Factory class for Audit entity."""

  @classmethod
  def clone(cls, audit, count_to_clone=1):
    """Clone Audit object.
    Predictable values will be used for type, title, id, href, url, slug.
    """
    # pylint: disable=anomalous-backslash-in-string
    from lib.service.rest_service import ObjectsInfoService
    actual_count_all_audits = ObjectsInfoService().get_total_count_objs(
        obj_name=objects.get_normal_form(cls.obj_audit, with_space=False))
    if actual_count_all_audits == audit.id:
      return [
          cls.update_obj_attrs_values(
              obj=copy.deepcopy(audit), id=audit.id + num,
              title=audit.title + " - copy " + str(num),
              href=re.sub("\d+$", str(audit.id + num), audit.href),
              url=re.sub("\d+$", str(audit.id + num), audit.url),
              slug=(cls.obj_audit.upper() + "-" + str(audit.id + num))) for
          num in xrange(1, count_to_clone + 1)]

  @classmethod
  def create_empty(cls):
    """Create blank Audit object."""
    empty_audit = entity.AuditEntity()
    empty_audit.type = cls.obj_audit
    return empty_audit

  @classmethod
  def create(cls, type=None, id=None, title=None, href=None, url=None,
             slug=None, status=None, program=None, contact=None,
             updated_at=None, custom_attribute_definitions=None,
             custom_attribute_values=None):
    """Create Audit object.
    Random values will be used for title and slug.
    Predictable values will be used for type, status, contact.
    """
    audit_entity = cls._create_random_audit()
    audit_entity = cls.update_obj_attrs_values(
        obj=audit_entity, type=type, id=id, title=title, href=href, url=url,
        slug=slug, status=status, program=program, contact=contact,
        updated_at=updated_at,
        custom_attribute_definitions=custom_attribute_definitions,
        custom_attribute_values=custom_attribute_values)
    return audit_entity

  @classmethod
  def _create_random_audit(cls):
    """Create Audit entity with randomly and predictably filled fields."""
    random_audit = entity.AuditEntity()
    random_audit.type = cls.obj_audit
    random_audit.title = cls.generate_string(cls.obj_audit)
    random_audit.slug = cls.generate_slug()
    random_audit.status = element.AuditStates().PLANNED
    random_audit.contact = ObjectOwnersFactory().default().__dict__
    return random_audit


class AssessmentTemplatesFactory(EntitiesFactory):
  """Factory class for Assessment Templates entities."""

  @classmethod
  def clone(cls, asmt_tmpl, count_to_clone=1):
    """Clone Assessment Template object.
    Predictable values will be used for type, title, id, href, url, slug.
    """
    # pylint: disable=anomalous-backslash-in-string
    from lib.service.rest_service import ObjectsInfoService
    actual_count_all_asmt_tmpls = ObjectsInfoService().get_total_count_objs(
        obj_name=objects.get_normal_form(cls.obj_asmt_tmpl, with_space=False))
    if actual_count_all_asmt_tmpls == asmt_tmpl.id:
      return [
          cls.update_obj_attrs_values(
              obj=copy.deepcopy(asmt_tmpl), id=asmt_tmpl.id + num,
              href=re.sub("\d+$", str(asmt_tmpl.id + num), asmt_tmpl.href),
              url=re.sub("\d+$", str(asmt_tmpl.id + num), asmt_tmpl.url),
              slug=("TEMPLATE-" + str(asmt_tmpl.id + num))) for
          num in xrange(1, count_to_clone + 1)]

  @classmethod
  def create_empty(cls):
    """Create blank Assessment Template object."""
    empty_asmt_tmpl = entity.AssessmentTemplateEntity()
    empty_asmt_tmpl.type = cls.obj_asmt_tmpl
    return empty_asmt_tmpl

  @classmethod
  def create(cls, type=None, id=None, title=None, href=None, url=None,
             slug=None, audit=None, default_people=None, verifiers=None,
             assessors=None, template_object_type=None, updated_at=None,
             custom_attribute_definitions=None,
             custom_attribute_values=None):
    """Create Assessment Template object.
    Random values will be used for title and slug.
    Predictable values will be used for type, template_object_type and
    default_people {"verifiers": *, "assessors": *}.
    """
    # pylint: disable=too-many-locals
    asmt_tmpl_entity = cls._create_random_asmt_tmpl()
    asmt_tmpl_entity = cls.update_obj_attrs_values(
        obj=asmt_tmpl_entity, type=type, id=id, title=title, href=href,
        url=url, slug=slug, audit=audit, default_people=default_people,
        verifiers=verifiers, assessors=assessors,
        template_object_type=template_object_type, updated_at=updated_at,
        custom_attribute_definitions=custom_attribute_definitions,
        custom_attribute_values=custom_attribute_values)
    return asmt_tmpl_entity

  @classmethod
  def _create_random_asmt_tmpl(cls):
    """Create Assessment Template entity with randomly and predictably
    filled fields.
    """
    random_asmt_tmpl = entity.AssessmentTemplateEntity()
    random_asmt_tmpl.type = cls.obj_asmt_tmpl
    random_asmt_tmpl.title = cls.generate_string(cls.obj_asmt_tmpl)
    random_asmt_tmpl.slug = cls.generate_slug()
    random_asmt_tmpl.template_object_type = cls.obj_control.title()
    random_asmt_tmpl.default_people = {"verifiers": roles.AUDITORS,
                                       "assessors": roles.AUDIT_LEAD}
    return random_asmt_tmpl


class AssessmentsFactory(EntitiesFactory):
  """Factory class for Assessments entities."""

  @classmethod
  def generate(cls, objs_under_asmt_tmpl, audit):
    """Generate Assessment object.
    Predictable values will be used for type, title, slug, audit.
    """
    # pylint: disable=too-many-locals
    from lib.service.rest_service import ObjectsInfoService
    actual_count_all_asmts = ObjectsInfoService().get_total_count_objs(
        obj_name=objects.get_normal_form(cls.obj_asmt, with_space=False))
    return [
        cls.create(
            title=obj_under_asmt_tmpl.title + " assessment for " + audit.title,
            slug=(cls.obj_asmt.upper() + "-" + str(asmt_number)),
            audit=audit.title) for asmt_number, obj_under_asmt_tmpl in
        enumerate(objs_under_asmt_tmpl, start=actual_count_all_asmts + 1)]

  @classmethod
  def create_empty(cls):
    """Create blank Assessment object."""
    empty_asmt = entity.AssessmentEntity()
    empty_asmt.type = cls.obj_asmt
    return empty_asmt

  @classmethod
  def create(cls, type=None, id=None, title=None, href=None, url=None,
             slug=None, status=None, object=None, audit=None,
             recipients=None, verified=None, updated_at=None,
             custom_attribute_definitions=None,
             custom_attribute_values=None):
    """Create Assessment object.
    Random values will be used for title and slug.
    Predictable values will be used for type, status, recipients, verified.
    """
    # pylint: disable=too-many-locals
    asmt_entity = cls._create_random_asmt()
    asmt_entity = cls.update_obj_attrs_values(
        obj=asmt_entity, type=type, id=id, title=title, href=href, url=url,
        slug=slug, status=status, object=object, audit=audit,
        recipients=recipients, verified=verified, updated_at=updated_at,
        custom_attribute_definitions=custom_attribute_definitions,
        custom_attribute_values=custom_attribute_values)
    return asmt_entity

  @classmethod
  def _create_random_asmt(cls):
    """Create Assessment entity with randomly and predictably filled fields."""
    random_asmt = entity.AssessmentEntity()
    random_asmt.type = cls.obj_asmt
    random_asmt.title = cls.generate_string(cls.obj_asmt)
    random_asmt.slug = cls.generate_slug()
    random_asmt.status = element.AssessmentStates.NOT_STARTED
    random_asmt.recipients = ",".join((roles.ASSESSOR, roles.CREATOR,
                                       roles.VERIFIER))
    random_asmt.verified = element.Common.FALSE
    return random_asmt


class IssuesFactory(EntitiesFactory):
  """Factory class for Issues entities."""

  @classmethod
  def create_empty(cls):
    """Create blank Issue object."""
    empty_issue = entity.IssueEntity
    empty_issue.type = cls.obj_issue
    return empty_issue

  @classmethod
  def create(cls, type=None, id=None, title=None, href=None, url=None,
             slug=None, status=None, audit=None, owners=None, contact=None,
             secondary_contact=None, updated_at=None,
             custom_attribute_definitions=None, custom_attribute_values=None):
    """Create Issue object.
    Random values will be used for title and slug.
    Predictable values will be used for type, status, owners and contact.
    """
    # pylint: disable=too-many-locals
    issue_entity = cls._create_random_issue()
    issue_entity = cls.update_obj_attrs_values(
        obj=issue_entity, type=type, id=id, title=title, href=href, url=url,
        slug=slug, status=status, audit=audit, owners=owners, contact=contact,
        secondary_contact=secondary_contact, updated_at=updated_at,
        custom_attribute_definitions=custom_attribute_definitions,
        custom_attribute_values=custom_attribute_values)
    return issue_entity

  @classmethod
  def _create_random_issue(cls):
    """Create Issue entity with randomly and predictably filled fields."""
    random_issue = entity.IssueEntity()
    random_issue.type = cls.obj_issue
    random_issue.title = cls.generate_string(cls.obj_issue)
    random_issue.slug = cls.generate_slug()
    random_issue.status = element.IssueStates.DRAFT
    random_issue.owners = [ObjectOwnersFactory().default().__dict__]
    random_issue.contact = ObjectOwnersFactory().default().__dict__
    return random_issue
