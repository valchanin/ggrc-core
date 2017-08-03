# Copyright (C) 2017 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
"""Modals for edit objects."""

from lib import decorator
from lib.constants import locator
from lib.page.modal import base as modal_base, delete_object


class _EditModal(modal_base.BaseModal):
  """Modal for edit objects."""

  def delete_object(self):
    """Return: delete_object.DeleteObjectModal
    """
    self._driver.find_element(*locator.ModalEditObject.BUTTON_DELETE).click()
    return delete_object.DeleteObjectModal(self._driver)

  @decorator.handle_alert
  def save_and_close(self):
    """Edit object and close Edit modal."""
    self.button_save_and_close.click()


class Assessments(modal_base.AsmtsModal, _EditModal):
  """Assessments edit modal."""


class Programs(modal_base.ProgramsModal, _EditModal):
  """Programs edit modal."""


class Controls(modal_base.ControlsModal, _EditModal):
  """Controls edit modal."""


class Risks(modal_base.RisksModal, _EditModal):
  """Risks edit modal."""


class OrgGroups(modal_base.OrgGroupsModal, _EditModal):
  """Org Groups edit modal."""


class Processes(modal_base.ProcessesModal, _EditModal):
  """Processes edit modal."""


class DataAssets(modal_base.RisksModal, _EditModal):
  """Data Assets edit modal."""


class Systems(modal_base.RisksModal, _EditModal):
  """Systems edit modal."""


class Products(modal_base.ProductsModal, _EditModal):
  """Products edit modal."""


class Projects(modal_base.ProjectsModal, _EditModal):
  """Projects edit modal."""
