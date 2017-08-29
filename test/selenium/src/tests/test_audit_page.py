# Copyright (C) 2017 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
"""Audit smoke tests."""
# pylint: disable=no-self-use
# pylint: disable=invalid-name
# pylint: disable=unused-argument
# pylint: disable=too-many-arguments

import pytest

from lib import base
from lib.constants.element import AssessmentStates
from lib.entities import entities_factory
from lib.service import webui_service


class TestAuditPage(base.Test):
  """Tests for audit functionality."""

  @pytest.fixture(scope="function")
  def create_and_clone_audit(
      self, new_program_rest, new_control_rest,
      map_new_program_rest_to_new_control_rest, new_audit_rest,
      new_assessment_rest, new_assessment_template_rest, new_issue_rest,
      selenium
  ):
    """Create Audit with clonable and non clonable objects via REST API and
    clone it with them via UI.
    Preconditions:
    - Program, Control created via REST API.
    - Control mapped to Program via REST API.
    - Audit created under Program via REST API.
    - Assessment, Assessment Template, Issue created under Audit via REST API.
    - Issue mapped to Audit via REST API.
    """
    # pylint: disable=too-many-locals
    expected_audit = entities_factory.AuditsFactory().clone(
        audit=new_audit_rest)[0]
    expected_asmt_tmpl = entities_factory.AssessmentTemplatesFactory().clone(
        asmt_tmpl=new_assessment_template_rest)[0]
    actual_audit = (webui_service.AuditsService(selenium).
                    clone_via_info_page_and_get_obj(audit_obj=new_audit_rest))
    return {
        "audit": new_audit_rest, "expected_audit": expected_audit,
        "actual_audit": actual_audit, "assessment": new_assessment_rest,
        "issue": new_issue_rest,
        "assessment_template": new_assessment_template_rest,
        "expected_assessment_template": expected_asmt_tmpl,
        "control": new_control_rest, "program": new_program_rest
    }

  @pytest.mark.smoke_tests
  def test_asmt_tmpl_creation(self, new_program_rest, new_audit_rest,
                              selenium):
    """Check if Assessment Template can be created from Audit page via
    Assessment Templates widget.
    Preconditions:
    - Audit created under Program via REST API.
    """
    expected_asmt_tmpl = (entities_factory.AssessmentTemplatesFactory().
                          create().repr_ui())
    (webui_service.AssessmentTemplatesService(selenium).
     create_obj_via_tree_view(src_obj=new_audit_rest, obj=expected_asmt_tmpl))
    actual_asmt_tmpls_tab_count = (
        webui_service.AssessmentTemplatesService(selenium).
        get_count_objs_from_tab(src_obj=new_audit_rest))
    assert len([expected_asmt_tmpl]) == actual_asmt_tmpls_tab_count
    actual_asmt_tmpls = (
        webui_service.AssessmentTemplatesService(selenium).
        get_list_objs_from_tree_view(src_obj=new_audit_rest))
    # due to 'expected_asmt_tmpl.updated_at = None'
    self.general_assert(
        [expected_asmt_tmpl], actual_asmt_tmpls, "updated_at")

  @pytest.mark.smoke_tests
  def test_asmt_creation(self, new_program_rest, new_audit_rest, selenium):
    """Check if Assessment can be created from Audit page via
    Assessments widget.
    Preconditions:
    - Audit created under Program via REST API.
    """
    expected_asmt = (entities_factory.AssessmentsFactory().
                     create().repr_ui())
    (webui_service.AssessmentsService(selenium).
     create_obj_via_tree_view(src_obj=new_audit_rest, obj=expected_asmt))
    actual_asmts_tab_count = (webui_service.AssessmentsService(selenium).
                              get_count_objs_from_tab(src_obj=new_audit_rest))
    assert len([expected_asmt]) == actual_asmts_tab_count
    actual_asmts = (webui_service.AssessmentsService(selenium).
                    get_list_objs_from_tree_view(src_obj=new_audit_rest))
    # due to 'expected_asmt.updated_at = None'
    self.general_assert(
        [expected_asmt], actual_asmts, "updated_at")

  @pytest.mark.parametrize(
      "dynamic_object, dynamic_relationships",
      [("new_control_rest", "map_new_program_rest_to_new_control_rest"),
       ("new_objective_rest", "map_new_program_rest_to_new_objective_rest")],
      indirect=True)
  @pytest.mark.smoke_tests
  def test_asmt_creation_with_mapping(
      self, new_program_rest, dynamic_object, dynamic_relationships,
      new_audit_rest, selenium
  ):
    """Check if Assessment can be created with mapped snapshot via
    Modal Create on Assessments TreeView. Additional check existing of
    mapped objs Titles on Modal Create.
    Preconditions:
    - Program, dynamic_object created via REST API.
    - dynamic_object mapped to Program via REST API.
    - Audit created under Program via REST API.
    Test parameters:
    - 'dynamic_object'.
    - 'dynamic_relationships'.
    """
    expected_asmt = (
        entities_factory.AssessmentsFactory().create(
            objects_under_assessment=[dynamic_object]))
    expected_titles = [dynamic_object.title]
    assessments_service = webui_service.AssessmentsService(selenium)
    actual_titles = (
        assessments_service.create_obj_and_get_mapped_titles_from_modal(
            src_obj=new_audit_rest, obj=expected_asmt))
    actual_asmt = assessments_service.get_list_objs_from_info_panels(
        src_obj=new_audit_rest, objs=[expected_asmt])[0]
    # due to issue GGRC-3033
    attrs_to_exclude = []
    if actual_asmt.status == AssessmentStates.IN_PROGRESS:
      attrs_to_exclude.append("status")
    self.general_assert(
        expected_asmt.repr_ui(), actual_asmt, *attrs_to_exclude)
    assert expected_titles == actual_titles
    if "status" in attrs_to_exclude:
      pytest.xfail(reason="GGRC-3033 Issue")
    else:
      pytest.fail(msg="GGRC-3033 Issue was fixed")

  @pytest.mark.smoke_tests
  @pytest.mark.parametrize(
      "dynamic_object",
      [None, "new_assessment_template_rest",
       "new_assessment_template_with_cas_rest"],
      ids=["Assessments generation without Assessment Template",
           "Assessments generation based on Assessment Template without LCAs",
           "Assessments generation based on Assessment Template with LCAs"],
      indirect=["dynamic_object"])
  def test_asmts_generation(
      self, new_program_rest, new_controls_rest,
      map_new_program_rest_to_new_controls_rest, new_audit_rest,
      dynamic_object, selenium
  ):
    """Check if Assessments can be generated from Audit page via Assessments
    widget using Assessment template and Controls.
    Preconditions:
    - Program, Controls created via REST API.
    - Controls mapped to Program via REST API.
    - Audit created under Program via REST API.
    Test parameters:
    - 'dynamic_object'.
    """
    expected_asmts = (entities_factory.AssessmentsFactory().generate(
        objs_under_asmt=new_controls_rest, audit=new_audit_rest,
        asmt_tmpl=dynamic_object))
    expected_asmts = [
        expected_asmt.repr_ui() for expected_asmt in expected_asmts]
    (webui_service.AssessmentsService(selenium).generate_objs_via_tree_view(
        src_obj=new_audit_rest, objs_under_asmt=new_controls_rest,
        asmt_tmpl_obj=dynamic_object))
    actual_asmts_tab_count = (webui_service.AssessmentsService(selenium).
                              get_count_objs_from_tab(src_obj=new_audit_rest))
    assert len(expected_asmts) == actual_asmts_tab_count
    actual_asmts = (webui_service.AssessmentsService(selenium).
                    get_list_objs_from_info_panels(
                        src_obj=new_audit_rest, objs=expected_asmts))
    # due to 'expected_asmt.updated_at = None',
    #        'expected_asmt.slug = None'
    #        'expected_asmt.custom_attributes = {None: None}'
    actual_asmts = [actual_asmt.update_attrs(
        is_replace_attrs=False, custom_attributes={None: None})
        for actual_asmt in actual_asmts]
    self.general_assert(expected_asmts, actual_asmts, "updated_at", "slug")

  @pytest.mark.smoke_tests
  @pytest.mark.cloning
  def test_cloned_audit_contains_new_attrs(self, create_and_clone_audit):
    """Check via UI that cloned Audit contains new predicted attributes.
    Preconditions:
    - Execution and return of fixture 'create_and_clone_audit'.
    """
    expected_audit = create_and_clone_audit["expected_audit"].repr_ui()
    actual_audit = create_and_clone_audit["actual_audit"]
    # due to 'expected_audit.slug = None'
    self.general_assert(
        expected_audit, actual_audit, "slug")

  @pytest.mark.smoke_tests
  @pytest.mark.cloning
  def test_non_clonable_objs_donot_move_to_cloned_audit(
      self, create_and_clone_audit, selenium
  ):
    """Check via UI that non clonable objects
    Assessment, Issue do not move to cloned Audit.
    Preconditions:
    - Execution and return of fixture 'create_and_clone_audit'.
    """
    actual_audit = create_and_clone_audit["actual_audit"]
    actual_asmts_tab_count = (webui_service.AssessmentsService(selenium).
                              get_count_objs_from_tab(src_obj=actual_audit))
    actual_asmts = (webui_service.AssessmentsService(selenium).
                    get_list_objs_from_tree_view(src_obj=actual_audit))
    actual_issues_tab_count = (webui_service.IssuesService(selenium).
                               get_count_objs_from_tab(src_obj=actual_audit))
    actual_issues = (webui_service.IssuesService(selenium).
                     get_list_objs_from_tree_view(src_obj=actual_audit))
    assert actual_asmts_tab_count == actual_issues_tab_count == 0
    assert bool(actual_asmts) == bool(actual_issues) == 0

  @pytest.mark.smoke_tests
  @pytest.mark.cloning
  def test_clonable_audit_related_objs_move_to_cloned_audit(
      self, create_and_clone_audit, selenium
  ):
    """Check via UI that clonable audit related object
    Assessment Template move to cloned Audit.
    Preconditions:
    -Execution and return of fixture 'create_and_clone_audit'.
    """
    actual_audit = create_and_clone_audit["actual_audit"]
    expected_asmt_tmpl = (
        create_and_clone_audit["expected_assessment_template"].repr_ui())
    actual_asmt_tmpls = (webui_service.AssessmentTemplatesService(selenium).
                         get_list_objs_from_tree_view(src_obj=actual_audit))
    # due to 'expected_asmt_tmpl.slug = None',
    #        'expected_asmt_tmpl.updated_at = {None: None}'
    self.general_assert(
        expected_asmt_tmpl, actual_asmt_tmpls, "slug", "updated_at")

  @pytest.mark.xfail(strict=True)
  @pytest.mark.smoke_tests
  @pytest.mark.cloning
  def test_clonable_not_audit_related_objs_move_to_cloned_audit(
      self, create_and_clone_audit, selenium
  ):
    """Check via UI that clonable not audit related objects
    Control, Program move to cloned Audit.
    Preconditions:
    -Execution and return of fixture 'create_and_clone_audit'.
    """
    actual_audit = create_and_clone_audit["actual_audit"]
    expected_control = create_and_clone_audit["control"].repr_ui()
    # due to 'actual_program.custom_attributes = {None: None}'
    expected_program = (create_and_clone_audit["program"].
                        repr_ui().update_attrs(custom_attributes={None: None}))
    actual_controls = (webui_service.ControlsService(selenium).
                       get_list_objs_from_tree_view(src_obj=actual_audit))
    actual_programs = (webui_service.ProgramsService(selenium).
                       get_list_objs_from_tree_view(src_obj=actual_audit))
    # due to 'actual_control.custom_attributes = {None: None}'
    self.general_assert(
        [expected_control], actual_controls, "custom_attributes")
    self.extended_assert([expected_program], actual_programs,
                         "Issue in app GGRC-2381", "manager")
