# Copyright (C) 2017 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
"""Assessments Workflow smoke tests."""
# pylint: disable=no-self-use
# pylint: disable=invalid-name
# pylint: disable=unused-argument
# pylint: disable=too-few-public-methods
# pylint: disable=too-many-arguments

import copy
import pytest

from lib import base
from lib.base import Test
from lib.constants import messages, roles
from lib.constants.element import AssessmentStates
from lib.constants.locator import ObjectWidget, WidgetInfoAssessment
from lib.entities import entities_factory
from lib.service import webui_service, rest_service
from lib.utils import selenium_utils


class TestAssessmentsWorkflow(base.Test):
  """Tests for Assessments Workflow functionality."""

  @classmethod
  def create_asmt(cls, new_audit_rest, has_verifier, initial_state):
    """Create Assessment with predefined state.
    Preconditions:
    - Program created via REST API.
    - Audit created under Program via REST API.
    - Assessment created under Audit via REST API.
    Returns UI representation of created object.
    """
    additional_params = {"status": initial_state}
    if has_verifier:
      additional_params["verifier"] = [roles.DEFAULT_USER]
    return rest_service.AssessmentsService().create_objs(
        count=1, factory_params=additional_params,
        audit=new_audit_rest.__dict__)[0]

  @classmethod
  def create_asmt_check_initial_state(
      cls, new_audit_rest, has_verifier, initial_state, assessments_service
  ):
    """Create Assessment with predefined state. Opens UI representation of
    created object and compares actual Assessment with expected one."""
    expected_asmt = cls.create_asmt(
        new_audit_rest, has_verifier, initial_state)
    expected_asmt_to_compare = copy.copy(expected_asmt)
    actual_asmts = (
        assessments_service.get_obj_from_info_page(expected_asmt))
    # due to 'actual_asmt.updated_at = None'
    # due to 'expected_asmt.custom_attributes = {None: None}'
    Test.extended_assert_wo_xfail(
        [expected_asmt_to_compare], actual_asmts,
        "custom_attributes", "updated_at")
    return expected_asmt

  @pytest.mark.smoke_tests
  def test_add_comment_to_asmt_via_info_panel(
      self, new_program_rest, new_audit_rest, new_assessment_rest, selenium
  ):
    """Check via UI of possibility to correctly add comment to Assessment via
    Info Panel.
    Preconditions:
    - Program created via REST API.
    - Audit created under Program via REST API.
    - Assessment created under Audit via REST API.
    Test parameters: None
    """
    expected_asmt = new_assessment_rest
    expected_asmt_comments = [entities_factory.CommentsFactory().
                              create().repr_ui()]
    # due to 'actual_asmt.updated_at = None'
    (expected_asmt.
     update_attrs(comments=expected_asmt_comments, updated_at=None).repr_ui())
    assessments_service = webui_service.AssessmentsService(selenium)
    asmt_comments_panel = assessments_service.add_comments(
        src_obj=new_audit_rest, obj=expected_asmt,
        comment_objs=expected_asmt_comments)
    assert asmt_comments_panel.is_input_empty is True
    actual_asmt = (
        webui_service.AssessmentsService(selenium).
        get_list_objs_from_info_panels(
            src_obj=new_audit_rest, objs=expected_asmt).update_attrs(
            comments={"created_at": None}, is_replace_dicts_values=True))
    assert expected_asmt == actual_asmt, (
        messages.AssertionMessages.
        format_err_msg_equal(expected_asmt, actual_asmt))

  @pytest.mark.smoke_tests
  @pytest.mark.parametrize(
      ("initial_state", "has_verifier"),
      [(AssessmentStates.NOT_STARTED, False),
       (AssessmentStates.NOT_STARTED, True),
       (AssessmentStates.IN_PROGRESS, False),
       (AssessmentStates.IN_PROGRESS, True)],
      ids=["Check if state of Assessment w'o verifier is changed from "
           "'Not Started' to 'In Progress' after update",
           "Check if state of Assessment w' verifier is changed from "
           "'Not Started' to 'In Progress' after update",
           "Check if state of Assessment w'o verifier is changed from "
           "'In Progress' to 'In Progress' after update",
           "Check if state of Assessment w' verifier is changed from "
           "'In Progress' to 'In Progress' after update"])
  def test_asmt_state_change_edit(
      self, new_program_rest, new_audit_rest, initial_state, has_verifier,
      selenium
  ):
    """Check Assessment workflow status change to correct state.
    Preconditions:
    - Program created via REST API.
    - Audit created under Program via REST API.
    - Assessment created under Audit via REST API.
    """
    assessments_service = webui_service.AssessmentsService(selenium)
    expected_asmt = (
        self.create_asmt_check_initial_state(
            new_audit_rest, has_verifier, initial_state, assessments_service))
    actual_asmt = (
        assessments_service.edit_obj_title_via_info_widget(
            expected_asmt).get_obj_from_info_page(obj=None))
    assert AssessmentStates.IN_PROGRESS.upper() == actual_asmt.status.upper()

  @pytest.mark.smoke_tests
  @pytest.mark.parametrize(
      ("initial_state", "final_state", "has_verifier"),
      [(AssessmentStates.NOT_STARTED, AssessmentStates.COMPLETED, False),
       (AssessmentStates.IN_PROGRESS, AssessmentStates.COMPLETED, False),
       (AssessmentStates.NOT_STARTED, AssessmentStates.READY_FOR_REVIEW, True),
       (AssessmentStates.IN_PROGRESS, AssessmentStates.READY_FOR_REVIEW, True)
       ],
      ids=["Check if state of Assessment w'o verifier is changed from "
           "'Not Started' to 'Completed' after 'Complete' button been pressed",
           "Check if state of Assessment w'o verifier is changed from "
           "'In Progress' to 'Completed' after 'Complete' button been pressed",
           "Check if state of Assessment w' verifier is changed from "
           "'Not Started' to 'Ready for Review' after 'Complete' button"
           " been pressed",
           "Check if state of Assessment w' verifier is changed from "
           "'In Progress' to 'Ready for Review' after 'Complete' button"
           " been pressed"
           ])
  def test_asmt_state_change_complete(
      self, new_program_rest, new_audit_rest, initial_state, final_state,
      has_verifier, selenium
  ):
    """Check Assessment workflow status change to correct state.
    Preconditions:
    - Program created via REST API.
    - Audit created under Program via REST API.
    - Assessment created under Audit via REST API.
    """
    assessments_service = webui_service.AssessmentsService(selenium)
    expected_asmt = (
        self.create_asmt_check_initial_state(
            new_audit_rest, has_verifier, initial_state, assessments_service))
    actual_asmt = (
        assessments_service.complete_assessment(expected_asmt).
        get_obj_from_info_page(obj=None))
    assert final_state.upper() == actual_asmt.status.upper()
    assert not selenium_utils.is_element_exist(
        selenium, ObjectWidget.HEADER_STATE_VERIFIED)

  @pytest.mark.smoke_tests
  @pytest.mark.parametrize(
      ("expected_state", "has_verified"),
      [(AssessmentStates.COMPLETED, True),
       (AssessmentStates.IN_PROGRESS, False)],
      ids=["Check if state of Assessment w' verifier is changed from "
           "'Ready for Review' to 'Completed' after 'Verify' button been"
           " pressed",
           "Check if state of Assessment w' verifier is changed from "
           "'Ready for Review' to 'In Progress' after 'Reject' button been"
           " pressed"
           ])
  def test_asmt_state_change_verify_or_reject(
      self, new_program_rest, new_audit_rest, expected_state, has_verified,
      selenium
  ):
    """Check Assessment workflow status change to correct state:
    Assessment state changes from 'Ready for Review' either to 'Completed'
    if press 'Verify' or to 'In Progress' if press 'Reject' button.
    Preconditions:
    - Program created via REST API.
    - Audit created under Program via REST API.
    - Assessment created under Audit via REST API.
    """
    assessments_service = webui_service.AssessmentsService(selenium)
    expected_asmt = (
        self.create_asmt_check_initial_state(
            new_audit_rest, True, AssessmentStates.IN_PROGRESS,
            assessments_service))
    expected_asmt.update_attrs(status=AssessmentStates.READY_FOR_REVIEW)
    rest_service.AssessmentsService().update_obj(expected_asmt)
    selenium_utils.refresh_page(selenium)
    if has_verified:
      info_page = assessments_service.verify_assessment(expected_asmt)
      selenium_utils.wait_until_elements_present(
          selenium, ObjectWidget.HEADER_STATE_VERIFIED,
          ObjectWidget.HEADER_STATE_COMPLETED,
          WidgetInfoAssessment.ICON_VERIFIED)
    else:
      info_page = assessments_service.reject_assessment(expected_asmt)
      assert not selenium_utils.is_element_exist(
          selenium, ObjectWidget.HEADER_STATE_VERIFIED)
    actual_asmt = info_page.get_obj_from_info_page(expected_asmt)
    assert expected_state.upper() == actual_asmt.status.upper()
