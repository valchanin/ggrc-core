# Copyright (C) 2017 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
"""Constants and methods for work with objects."""


# objects
PROGRAMS = "programs"
WORKFLOWS = "workflows"
AUDITS = "audits"
ASSESSMENTS = "assessments"
ASSESSMENT_TEMPLATES = "assessment_templates"
ISSUES = "issues"
DIRECTIVES = "directives"
REGULATIONS = "regulations"
POLICIES = "policies"
STANDARDS = "standards"
CONTRACTS = "contracts"
CLAUSES = "clauses"
SECTIONS = "sections"
CONTROLS = "controls"
OBJECTIVES = "objectives"
PEOPLE = "people"
ORG_GROUPS = "org_groups"
VENDORS = "vendors"
ACCESS_GROUPS = "access_groups"
SYSTEMS = "systems"
PROCESSES = "processes"
DATA_ASSETS = "data_assets"
PRODUCTS = "products"
PROJECTS = "projects"
FACILITIES = "facilities"
MARKETS = "markets"
RISKS = "risks"
THREATS = "threats"
RISK_ASSESSMENTS = "risk_assessments"
CUSTOM_ATTRIBUTES = "custom_attribute_definitions"

ALL_SNAPSHOTABLE_OBJS = (
    ACCESS_GROUPS, CLAUSES, CONTRACTS, CONTROLS, DATA_ASSETS, FACILITIES,
    MARKETS, OBJECTIVES, ORG_GROUPS, POLICIES, PROCESSES, PRODUCTS,
    REGULATIONS, SECTIONS, STANDARDS, SYSTEMS, VENDORS, RISKS, THREATS,
    RISK_ASSESSMENTS, PROJECTS
)

ALL_CA_OBJS = ALL_SNAPSHOTABLE_OBJS + (
    WORKFLOWS, PROGRAMS, AUDITS, ISSUES, ASSESSMENTS, PEOPLE)


def _get_singular(plurals):
  """
 Return: list of basestring: Capitalized object names in singular form
 """
  singulars = []
  for name in plurals:
    name = name.lower()
    if name == PEOPLE:
      singular = "person"
    elif name == POLICIES:
      singular = "policy"
    elif name == PROCESSES:
      singular = "process"
    elif name == FACILITIES:
      singular = "facility"
    else:
      singular = name[:-1]
    singulars.append(singular.upper())
  return singulars


def get_singular(plural, title=False):
  """Transform object name to singular and lower or title form.
 Example: risk_assessments -> risk_assessment
 """
  _singular = _get_singular([plural])[0]
  if title:
    _singular = _singular.title()
  else:
    _singular = _singular.lower()
  return _singular


def get_normal_form(obj_name, with_space=True):
  """Transform object name to title form.
 Example:
 if with_space=True then risk_assessments -> Risk Assessments
 if with_space=False then risk_assessments -> RiskAssessments
 """
  normal = obj_name.replace("_", " ").title()
  if with_space is True:
    return normal
  elif with_space is False:
    return normal.replace(" ", "")


ALL_PLURAL = [k for k in globals().keys() if
              not k.startswith("_") and "ALL" not in k and k.isupper()]

ALL_SINGULAR = _get_singular(ALL_PLURAL)
