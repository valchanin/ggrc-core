# Copyright (C) 2017 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
"""Base classes."""
# pylint: disable=too-few-public-methods

import re

import pytest

from selenium import webdriver
from selenium.webdriver.common import keys
from selenium.webdriver.common.by import By
from selenium.webdriver.remote import webelement

from lib import constants, exception, mixin
from lib.constants import url, messages
from lib.constants.element import MappingStatusAttrs
from lib.constants.locator import CommonDropdownMenu
from lib.entities.entity import Entity
from lib.utils import selenium_utils


class InstanceRepresentation(object):
  def __repr__(self):
    return str(
        {key: value for key, value in self.__dict__.items()
         if "__" not in key})


class CustomDriver(webdriver.Chrome):
  """Extension to web driver."""

  def find_elements_by_visible_locator(self, locator):
    """Sometimes we have to find in list of elements only that one that is
    visible to user.
    Args: locator (tuple)
    Return: selenium.webdriver.remote.webelement.WebElement
    Raises: exception.ElementNotFound
    """
    # pylint: disable=invalid-name
    elements = self.find_elements(*locator)
    for element in elements:
      if element.is_displayed():
        return element
    raise exception.ElementNotFound(locator)


class Test(InstanceRepresentation):
  __metaclass__ = mixin.MetaTestDecorator

  @staticmethod
  def extended_assert(expected_objs, actual_objs, issue_msg, *exclude_attrs):
    """Perform extended assert for expected and actual objects according to
    dictionary of attributes to exclude and providing issue's message.
    Initially, based on original objects prepare expected and actual
    collections to performing of extended comparison procedure ('split_objs'),
    where:
    'exp_objs_wo_ex_attrs', 'act_objs_wo_ex_attrs' - list objects w/o excluding
    attributes;
    'exp_ex_attrs', 'act_ex_attrs' - list dictionaries w/ excluding attributes
    (items which contain attributes' names and values);
    'issue_msg' - issue message for pytest xfail procedure;
    'exclude_attrs' - list of excluding attributes names.
    Finally, make pytest assert for objects, then xfail assert for attributes.
    """
    split_objs = (
        Test.extended_assert_wo_xfail(
            expected_objs, actual_objs, *exclude_attrs))
    assert (True if Entity.is_list_of_attrs_equal(
        split_objs["exp_ex_attrs"], split_objs["act_ex_attrs"])
        else pytest.xfail(reason=issue_msg))

  @staticmethod
  def extended_assert_wo_xfail(expected_objs, actual_objs, *exclude_attrs):
    """Perform extended assert for expected and actual objects according to
    dictionary of attributes to exclude and providing issue's message.
    Initially, based on original objects prepare expected and actual
    collections to performing of extended comparison procedure ('split_objs'),
    where:
    'exp_objs_wo_ex_attrs', 'act_objs_wo_ex_attrs' - list objects w/o excluding
    attributes;
    'exp_ex_attrs', 'act_ex_attrs' - list dictionaries w/ excluding attributes
    (items which contain attributes' names and values);
    'issue_msg' - issue message for pytest xfail procedure;
    'exclude_attrs' - list of excluding attributes names.
    """
    split_objs = Entity.extract_excluding_attrs(
        expected_objs, actual_objs, *exclude_attrs)
    assert (split_objs["exp_objs_wo_ex_attrs"] ==
            split_objs["act_objs_wo_ex_attrs"]), (
        messages.AssertionMessages.format_err_msg_equal(
            split_objs["exp_objs_wo_ex_attrs"],
            split_objs["act_objs_wo_ex_attrs"]))
    return split_objs


class TestUtil(InstanceRepresentation):
  """Abstract class for all test util classes."""


class Element(InstanceRepresentation):
  """Element class represents primitives in models. Initializing by 'driver'
  Web driver and 'locator_or_element' (CSS selector (tuple) or Web element
  (instance of webelement.WebElement).
  """

  def __init__(self, driver, locator_or_element):
    super(Element, self).__init__()
    self._driver = driver
    self.locator_or_element = locator_or_element
    self.element = self.get_element()
    self.text = self.element.text

  def _get_visible_element(self):
    """Get element: if self object 'locator_or_element' is already Web element
    then try wait until it will be visible else try to find visible Web element
    using selenium utils method 'get_when_visible'.
    Return: selenium.webdriver.remote.webelement.WebElement
    """
    if isinstance(self.locator_or_element, webelement.WebElement):
      selenium_utils.wait_until_condition(
          self._driver, lambda x: self.locator_or_element.is_displayed())
      return self.locator_or_element
    return selenium_utils.get_when_visible(
        self._driver, self.locator_or_element)

  def get_element(self):
    """Get element if it is displayed."""
    return self._get_visible_element()

  def click(self):
    """Click on element."""
    self.element.click()

  def click_via_js(self):
    """Click on element using JS."""
    selenium_utils.click_via_js(self._driver, self.element)


class Label(Element):
  """Generic label."""


class RichTextInputField(Element):
  """Common class for representation of Rich Text input."""

  def enter_text(self, text):
    """Clear text from element and enter new text."""
    self.element.clear()
    self.element.send_keys(text)
    self.text = text

  def paste_from_clipboard(self, element):
    """
    Paste value from clipboard into text input element.
    Details:
    We want to update value of this element after pasting. In order to
    do that, we click on another element.
    Args: element (Element)
    """
    self.element.clear()
    self.element.send_keys(keys.Keys.CONTROL, 'v')
    element.click()
    element = self._driver.find_element(*self.locator_or_element)
    self.text = element.get_attribute("value")


class TextInputField(RichTextInputField):
  """Generic model for text input field."""


class Iframe(Element):
  """Iframe element methods."""

  def find_iframe_and_enter_data(self, text):
    """
    Args: text (basestring): string want to enter
    """
    self._driver.switch_to.frame(self.element)
    element = self._driver.find_element_by_tag_name("body")
    element.clear()
    element.send_keys(text)
    self._driver.switch_to.default_content()
    self.text = text


class DatePicker(Element):
  """Date picker element methods."""

  def __init__(self, driver, date_picker_locator, field_locator):
    """
    Args:
    date_picker_locator (tuple)
    field_locator (tuple): locator of field we have to click on to
    activate date picker
    """
    super(DatePicker, self).__init__(driver, field_locator)
    self._locator_datepcker = date_picker_locator
    self._element_datepicker = None

  def get_day_els_current_month(self):
    """Get day elements for current month.
    Return: list of selenium.webdriver.remote.webelement.WebElement
    """
    self.element.click()
    elements = self._driver.find_elements(*self._locator_datepcker)
    return elements

  def select_day_in_current_month(self, day):
    """Select day - sequential element from date picker. Days go from 0 to
    28,29 or 30, depending on current month. Since we're selecting an element
    from list, we can pass e.g. -1 to select last day in month.
    Args: day (int)
    """
    elements = self.get_day_els_current_month()
    elements[day].click()
    # wait for fadeout in case we're above some other element
    selenium_utils.get_when_invisible(self._driver, self._locator_datepcker)
    self.text = self.element.get_attribute("value")

  def select_month_end(self):
    """Select last day of current month."""
    elements = self.get_day_els_current_month()
    elements[-1].click()
    # wait for fadeout in case we're above some other element
    selenium_utils.get_when_invisible(self._driver, self._locator_datepcker)
    self.text = self.element.get_attribute("value")

  def select_month_start(self):
    """Select first day of current month."""
    elements = self.get_day_els_current_month()
    elements[0].click()
    # wait for fadeout in case we're above some other element
    selenium_utils.get_when_invisible(self._driver, self._locator_datepcker)
    self.text = self.element.get_attribute("value")


class Button(Element):
  """Generic button element."""


class Checkbox(Element):
  """Generic checkbox element."""

  def check(self):
    """Select checkbox."""
    if not self.element.is_checked():
      self.element.click()

  def uncheck(self):
    """Unselect checkbox."""
    if self.element.is_checked():
      self.element.click()

  def is_checked_via_js(self):
    """Check if checkbox is checked using JS."""
    return selenium_utils.is_element_checked(self._driver, self.element)


class Toggle(Element):
  """Generic toggle element.
 Note that special function is used for detecting if element is active
 which may not work on an arbitrary element.
 """

  def __init__(self, driver, locator_or_element, is_active_attr_val="active"):
    super(Toggle, self).__init__(driver, locator_or_element)
    self.is_activated = selenium_utils.is_value_in_attr(
        self.element, value=is_active_attr_val)

  def toggle(self, on_el=True):
    """Click on element based on is_active status and "on" arg.
    Args: on_el (bool)
    """
    if on_el and not self.is_activated:
      self.element.click()
      self.is_activated = True
    elif not on_el and self.is_activated:
      self.element.click()
      self.is_activated = False


class Tab(Element):
  """Generic element representing tab."""
  def __init__(self, driver, locator_or_element, is_activated=True):
    super(Tab, self).__init__(driver, locator_or_element)
    self.is_activated = is_activated

  def click(self):
    """When clicking on tab to first make sure it's clickable i.e.
    that this element will receive click."""
    self.element.click()
    self.is_activated = True


class Dropdown(Element):
  """Generic dropdown."""


class DropdownStatic(Element):
  """Dropdown with predefined static elements."""

  def find_options(self):
    return self.element.find_elements(*CommonDropdownMenu.DROPDOWN_OPTIONS)

  def select(self, member_name):
    """Selects dropdown element based on dropdown element name."""
    for element in self.find_options():
      if element.get_attribute("value") == member_name:
        element.click()
        break
    else:
      exception.ElementNotFound(member_name)


class Component(InstanceRepresentation):
  """Component class is container for elements."""

  def __init__(self, driver):
    """
    Args: driver (CustomDriver)
    """
    self._driver = driver
    if driver.title:  # only Login page doesn't have title and jQuery
      selenium_utils.wait_for_js_to_load(driver)


class AnimatedComponent(Component):
  """Class for components where animation must first complete before
 elements are visible."""

  def __init__(self, driver, locators_to_check, wait_until_visible):
    """
    Args:
    driver (CustomDriver)
    locators_to_check (list of tuples): locators to wait for to become
    (in)visible
    wait_until_visible (bool): for all elements to be visible do we
    have to wait for certain elements to be invisible or visible?
    """
    super(AnimatedComponent, self).__init__(driver)
    self._locators = locators_to_check
    if wait_until_visible:
      self._wait_until_visible()
    else:
      self._wait_until_invisible()

  def _wait_until_visible(self):
    for item_locator in self._locators:
      selenium_utils.get_when_visible(self._driver, item_locator)

  def _wait_until_invisible(self):
    for item_locator in self._locators:
      selenium_utils.get_when_invisible(self._driver, item_locator)


class Modal(Component):
  """Generic modal element."""


class FilterCommon(Component):
  """Common filter elements for LHN and Tree View."""

  def __init__(self, driver, text_box_locator, bt_submit_locator):
    super(FilterCommon, self).__init__(driver)
    self.text_box = TextInputField(driver, text_box_locator)
    self.button_submit = Button(driver, bt_submit_locator)

  def enter_query(self, query):
    """Enter query to field."""
    self.text_box.enter_text(query)

  def submit_query(self):
    """Submit query that was entered to field."""
    self.button_submit.click()
    selenium_utils.wait_for_js_to_load(self._driver)

  def perform_query(self, query):
    """Clear filtering field, enter query and click submit."""
    self.enter_query(query)
    self.submit_query()


class FilterLHN(FilterCommon):
  """Filter elements for LHN."""

  def __init__(self, driver, text_box_locator,
               bt_submit_locator, bt_clear_locator):
    super(FilterLHN, self).__init__(driver, text_box_locator,
                                    bt_submit_locator)
    # clear button is only visible after a query is entered
    self.button_clear = driver.find_element(*bt_clear_locator)

  def clear_query(self):
    """Clear query that was entered to field."""
    self.button_clear.click()
    selenium_utils.wait_for_js_to_load(self._driver)


class AbstractPage(Component):
  """Represent page that can be navigate to, but we don't necessarily know
 it's url in advance."""

  def __init__(self, driver):
    """
    Args: driver (CustomDriver)
    """
    super(AbstractPage, self).__init__(driver)
    self.url = driver.current_url

  def navigate_to(self, custom_url=None):
    """Navigate to url."""
    url_to_use = self.url if custom_url is None else custom_url
    selenium_utils.open_url(self._driver, url_to_use)
    return self


class Page(AbstractPage):
  """Page class represents components with special properties i.e. they
 have *static* URL-s, can be navigated to etc."""
  URL = None

  def __init__(self, driver):
    """
    Args: driver (CustomDriver)
    """
    super(Page, self).__init__(driver)
    self.navigate_to(self.URL)


class DropdownDynamic(AnimatedComponent):
  """Dropdown that doesn't load all contents at once."""

  def __init__(self, driver, locators_to_check, wait_until_visible):
    """
    Args:
    driver (CustomDriver)
    locators_to_check (list of tuples): locators to wait for to become
    (in)visible
    wait_until_visible (bool): for all elements to be visible do we
    have to wait for certain elements to be invisible or visible?
    """
    super(DropdownDynamic, self).__init__(driver, locators_to_check,
                                          wait_until_visible)
    self.members_visible = None
    self.members_loaded = None

  def _update_loaded_members(self):
    """New members that are loaded are added to members_loaded container."""
    raise NotImplementedError

  def _set_visible_members(self):
    """When moving in dropdown it can happen we don't always see all
    the members. Here we set members, that are visible to user."""
    raise NotImplementedError

  def scroll_down(self):
    raise NotImplementedError

  def scroll_up(self):
    raise NotImplementedError


class Selectable(Element):
  """Representing list of elements that are selectable."""


class MultiInputField(Element):
  """Representing fields that added plus sign."""
  _locators = constants.locator.MultiInputField

  def __init__(self, driver, loc_or_el):
    super(MultiInputField, self).__init__(driver, loc_or_el)
    self._items = None
    self.add_btn = Button(self.element, self._locators.ADD_BTN_CSS)

  def _init_items(self):
    """Init list of input items into multi input field."""
    self._items = [
        MultiInputItem(self._driver, el) for el in
        selenium_utils.get_when_all_visible(
            self._driver, self._locators.ITEMS)]

  @property
  def values(self):
    """Return list of text w/o date from each multi input item field."""
    self._init_items()
    return [item.link.text for item in self._items]

  def add_values(self, *values):
    """Add values to multiple input field."""
    for value in values:
      self.add_btn.click()
      TextInputField(self.element, self._locators.TXT_CSS).enter_text(value)
      Button(self.element, self._locators.APPLY_BTN_CSS).click()

  def del_values(self, *values):
    """Remove values from multiple input field."""
    raise NotImplementedError


class MultiInputItem(Element):
  """Representing single item in multi input field."""
  _locators = constants.locator.MultiInputItem

  @property
  def link(self):
    """Return link element of from multi input item field."""
    return Element(self.element, self._locators.LINK_CSS)

  @property
  def date(self):
    """Return date as string in mm/dd/yyyy format when input item was
    entered.
    """
    return Element(self.element, self._locators.DATE).text


class Widget(AbstractPage):
  """Page like class for which we don't know initial url."""

  def __init__(self, driver):
    """
    Args: driver (CustomDriver)
    """
    super(Widget, self).__init__(driver)
    matched_url_parts = re.search(
        constants.regex.URL_WIDGET_INFO, self.url + "/").groups()
    (source_obj_plural, source_obj_id, widget_name,
     mapped_obj_singular, mapped_obj_id) = matched_url_parts
    self.source_obj_from_url = source_obj_plural

    self.source_obj_id_from_url = source_obj_id
    self.widget_name_from_url = (widget_name.split("_")[0] or
                                 constants.element.WidgetBar.INFO)
    self.mapped_obj_from_url = mapped_obj_singular
    self.mapped_obj_id_from_url = mapped_obj_id


class TreeView(Component):
  """Common class for representing Tree View list with several objects."""
  # pylint: disable=too-many-instance-attributes
  _locators = constants.locator.TreeView

  def __init__(self, driver, obj_name=None):
    super(TreeView, self).__init__(driver)
    self._tree_view_headers = []
    self._tree_view_items = []
    self.locator_set_visible_fields = None
    self.locator_no_results_message = self._locators.NO_RESULTS_MESSAGE
    self.obj_name = obj_name
    if self.obj_name is not None:
      self.widget_name = url.get_widget_name_of_mapped_objs(obj_name)
      from lib import factory
      self.fields_to_set = factory.get_fields_to_set(object_name=self.obj_name)

  def wait_loading_after_actions(self):
    """Wait loading elements of Tree View after made some action with
    object(s) under Tree View.
    """
    selenium_utils.wait_until_not_present(
        self._driver, self._locators.ITEM_LOADING)
    selenium_utils.get_when_invisible(self._driver, self._locators.SPINNER)
    selenium_utils.wait_for_js_to_load(self._driver)

  def _init_tree_view_headers(self):
    """Init Tree View headers as list of elements from current widget."""
    _locator_header = (By.CSS_SELECTOR, self._locators.HEADER)
    self._tree_view_headers = selenium_utils.get_when_all_visible(
        self._driver, _locator_header)

  def _init_tree_view_items(self):
    """Init Tree View items as list of TreeViewItem from current widget.
    If no items in tree view return empty list.
    """
    _locator_items = (
        By.CSS_SELECTOR, self._locators.ITEMS)
    self.wait_loading_after_actions()
    has_no_record_found = selenium_utils.is_element_exist(
        self._driver, self.locator_no_results_message)
    self._tree_view_items = (
        [] if has_no_record_found else [
            TreeViewItem(
                driver=self._driver, locator_or_element=element,
                item_btn_locator=(
                    By.CSS_SELECTOR, self._locators.ITEM_EXPAND_BUTTON))
            for element in selenium_utils.get_when_all_visible(
                self._driver, _locator_items)])
    return self._tree_view_items

  def tree_view_headers(self):
    """Return Tree View header as list of elements from current widget."""
    if not self._tree_view_headers:
      self._init_tree_view_headers()
    return self._tree_view_headers

  def tree_view_items(self):
    """Return Tree View items as list of TreeViewItem from current widget."""
    if not self._tree_view_items:
      self._init_tree_view_items()
    return self._tree_view_items

  def open_set_visible_fields(self):
    """Click to Set Visible Fields button on Tree View to open
    Set Visible Fields modal.
    Return: lib.page.modal.set_fields.SetVisibleFieldsModal
    """
    _locator_set_visible_fields = self.locator_set_visible_fields
    Button(self._driver, _locator_set_visible_fields).click()
    return SetVisibleFieldsModal(self._driver, self.fields_to_set)

  def get_list_members_as_list_scopes(self):
    """Get list of scopes (dicts) from members (text scopes) which displayed on
    Tree View according to current set of visible fields.
    """
    list_scopes = self._tree_view_items
    if self._init_tree_view_items():
      list_headers = [_item.text.splitlines()[:len(self.fields_to_set)] for
                      _item in self.tree_view_headers()]
      # u'Ex' to u'Ex', u'Ex1, Ex2' to [u'Ex1', u'Ex2']
      list_lists_items = [
          [_.split(", ") if len(_.split(", ")) >= 2 else _ for
           _ in _item.cell_values[:len(self.fields_to_set)]] for
          _item in self.tree_view_items()]
      list_scopes = [
          dict(zip(list_headers[0], item)) for item in list_lists_items]
    return list_scopes


class UnifiedMapperTreeView(TreeView):
  """Tree-View class for Unified Mapper"""
  _locators = constants.locator.UnifiedMapperTreeView

  def __init__(self, driver, obj_name):
    super(UnifiedMapperTreeView, self).__init__(driver, obj_name=obj_name)
    self.locator_set_visible_fields = (By.CSS_SELECTOR,
                                       self._locators.BUTTON_SHOW_FIELDS)
    self.locator_no_results_message = (By.CSS_SELECTOR,
                                       self._locators.NO_RESULTS_MESSAGE)

  def open_set_visible_fields(self):
    """Click to Set Visible Fields button on Tree View to open
    Set Visible Fields modal.
    Return: lib.page.modal.set_fields.SetVisibleFieldsModal
    """
    _locator_set_visible_fields = self.locator_set_visible_fields
    Button(self._driver, _locator_set_visible_fields).click()
    return MapperSetVisibleFieldsModal(self._driver, self.fields_to_set)


class AdminTreeView(TreeView):
  """Class for representing Tree View list in Admin dashboard."""
  _locators = constants.locator.AdminTreeView

  def __init__(self, driver, widget_name):
    super(AdminTreeView, self).__init__(driver)
    self.widget_name = widget_name


class SetVisibleFieldsModal(Modal):
  """Modal to select and set visible fields for objects to represent them on
  Tree View."""
  _locators = constants.locator.ModalSetVisibleFields

  def __init__(self, driver, fields_to_set):
    super(SetVisibleFieldsModal, self).__init__(driver)
    self.fields_to_set = fields_to_set
    self.visible_fields_elements = None

  def select_visible_fields(self):
    """Select visible fields checkboxes on Select Visible Fields modal
    according to titles of fields to set."""
    # pylint: disable=attribute-defined-outside-init
    _locator_modal_fields = (By.CSS_SELECTOR,
                             self._locators.MODAL)
    _locator_fields_titles = (
        By.CSS_SELECTOR,
        self._locators.FIELDS_TITLES)
    _locator_fields_checkboxes = (
        By.CSS_SELECTOR,
        self._locators.FIELDS_CHECKBOXES)
    selenium_utils.get_when_visible(self._driver, _locator_modal_fields)
    self.visible_fields_elements = ListCheckboxes(
        self._driver, titles_locator=_locator_fields_titles,
        checkboxes_locator=_locator_fields_checkboxes)
    self.visible_fields_elements.select_by_titles(self.fields_to_set)

  def confirm_set_visible_fields(self):
    """Confirm set visible fields."""
    _locator_set_fields = (
        By.CSS_SELECTOR,
        self._locators.BUTTON_SET_FIELDS)
    Button(self._driver, _locator_set_fields).click_via_js()  # issue GGRC-1854
    selenium_utils.get_when_invisible(self._driver, _locator_set_fields)

  def select_and_set_visible_fields(self):
    """Select checkboxes to set objects visible fields and confirm set."""
    self.select_visible_fields()
    self.confirm_set_visible_fields()


class MapperSetVisibleFieldsModal(SetVisibleFieldsModal):
  """Modal to select and set visible fields for objects to represent them on
  Tree View."""
  _locators = constants.locator.ModalSetVisibleFieldsMapper


class TreeViewItem(Element):
  """Class for describing single item on Tree View."""
  _locators = constants.locator.TreeViewItem

  def __init__(self, driver, locator_or_element, item_btn_locator=None):
    super(TreeViewItem, self).__init__(driver, locator_or_element)
    self.item_btn = (
        None if item_btn_locator is None else
        selenium_utils.get_element_by_element_safe(
            self.element, item_btn_locator))

  def expand(self):
    """Expand Tree View item if it is not expanded already."""
    from lib.page.widget.widget_base import CustomAttributesItemContent
    if not self.is_expanded:
      self.item_btn.click()
      selenium_utils.wait_until_stops_moving(self.item_btn)
    return CustomAttributesItemContent(self._driver, self.text)

  def collapse(self):
    """Collapse Tree View item if it is expanded."""
    if self.is_expanded:
      self.item_btn.click()
      selenium_utils.wait_until_stops_moving(self.item_btn)

  @property
  def is_expanded(self):
    return selenium_utils.is_value_in_attr(self.item_btn)

  @property
  def cell_values(self):
    """Return list of text from each cell"""
    return [cell.text for
            cell in selenium_utils.get_when_all_visible(
                self.element, self._locators.CELL)]


class CommentsPanel(Element):
  """Representing comments panel witch contains input part and items."""
  _locators = constants.locator.CommentsPanel

  def __init__(self, driver, locator_or_element):
    super(CommentsPanel, self).__init__(driver, locator_or_element)
    self._items = []
    self.header_lbl = Label(
        self.element, self._locators.HEADER_LBL_CSS)
    self.input_txt = RichTextInputField(
        self.element, self._locators.INPUT_TXT_CSS)
    self.add_btn = Button(self.element, self._locators.ADD_BTN_CSS)
    self.send_cb = Checkbox(self.element, self._locators.CB_SEND_CSS)

  @property
  def scopes(self):
    """Return list of text comments in dictionary format where each of them
    contains items:
    {'modified_by': person, 'created_at': datetime, 'description': text}.
    """
    self._items = [
        CommentItem(self._driver, element) for element in
        self.element.find_elements(*self._locators.ITEMS_CSS)]
    return [
        {"modified_by": item.author.text, "created_at": item.datetime.text,
         "description": item.content.text} for item in self._items]

  @property
  def count(self):
    """Return count of text comments on comments panel."""
    return len(self.scopes)

  @property
  def is_input_empty(self):
    """Return 'True' if comments input field is empty, else 'False'."""
    return not self.element.find_element(
        *self.input_txt.locator_or_element).text

  def add_comments(self, *comments):
    """Add text comments to input field."""
    for comment in comments:
      self.input_txt.enter_text(comment)
      self.add_btn.click()
      selenium_utils.get_when_invisible(
          self._driver, self._locators.CB_SPINNER_CSS)
    return self


class CommentItem(Element):
  """Representing single comment item in comments' panel."""
  _locators = constants.locator.CommentItem

  @property
  def author(self):
    """Return author element of comment from comments item."""
    return Element(self.element, self._locators.AUTHOR_CSS)

  @property
  def datetime(self):
    """Return datetime element of comment from comments item when comments
    was added.
    """
    return Label(self.element, self._locators.DATETIME_CSS)

  @property
  def content(self):
    """Return content element of comment from comments item."""
    return Label(self.element, self._locators.CONTENT_CSS)


class ListCheckboxes(Component):
  """Generic list of checkboxes elements."""

  def __init__(self, driver, titles_locator, checkboxes_locator):
    super(ListCheckboxes, self).__init__(driver)
    self.locator_titles = titles_locator
    self.locator_checkboxes = checkboxes_locator

  @staticmethod
  def _unselect_unnecessary(objs, list_titles):
    """Unselect unnecessary elements according objs (titles and checkboxes
    elements) and list of titles."""
    unselect = [obj[1].click() for obj in objs
                if obj[0].text not in list_titles if obj[1].is_selected()]
    return unselect

  @staticmethod
  def _select_necessary(objs, list_titles):
    """Select necessary elements according objs (titles and checkboxes
    elements) and list of titles."""
    select = [obj[1].click() for obj in objs
              if obj[0].text in list_titles if not obj[1].is_selected()]
    return select

  def select_by_titles(self, list_titles):
    """Select checkboxes according titles."""
    selenium_utils.wait_for_js_to_load(self._driver)
    selenium_utils.get_when_all_visible(self._driver, self.locator_titles)
    objs_titles = self._driver.find_elements(*self.locator_titles)
    objs_checkboxes = self._driver.find_elements(*self.locator_checkboxes)
    objs = zip(objs_titles, objs_checkboxes)
    self._unselect_unnecessary(objs, list_titles)
    self._select_necessary(objs, list_titles)

  def get_mapping_statuses(self):
    """Get list of mapping statuses by given titles"""
    selenium_utils.get_when_all_visible(self._driver, self.locator_titles)
    objs_titles = self._driver.find_elements(*self.locator_titles)
    objs_checkboxes = self._driver.find_elements(*self.locator_checkboxes)
    objs = [
        MappingStatusAttrs(obj[0], obj[1][0], obj[1][1]) for obj in zip(
            [obj.text for obj in objs_titles],
            [[obj.is_selected(),
              not obj.is_enabled()]
                for obj in objs_checkboxes])]
    return objs


class DropdownMenu(Component):
  """Class for common DropdownMenu Element"""
  _locators = constants.locator.CommonDropdownMenu

  def __init__(self, driver, element_or_locator):
    super(DropdownMenu, self).__init__(driver)
    self._driver = driver
    self.dropdown_element = self._get_dropdown_element(element_or_locator)
    self._dropdown_items = []

  def _get_dropdown_element(self, el_or_loc):
    """Return  DropdownMenu element if element not defined find it by
    locator"""
    element = (el_or_loc if isinstance(
               el_or_loc, webdriver.remote.webelement.WebElement)
               else selenium_utils.get_when_visible(self._driver, el_or_loc))
    return (element if element.tag_name == self._locators.DROPDOWN_MAIN_CSS[1]
            else element.find_element(*self._locators.DROPDOWN_MAIN_CSS))

  def dropdown_items(self):
    """Return list of DropdownMenu Items defined  by "li" tag"""
    if not self._dropdown_items:
      elements_on_dropdown = selenium_utils.get_when_all_visible(
          self.dropdown_element,
          self._locators.DROPDOWN_ITEMS_CSS)
      self._dropdown_items = [DropdownMenuItem(self._driver, el) for el in
                              elements_on_dropdown]
    return self._dropdown_items

  def get_dropdown_item(self, out_item_type):
    """Return DropdownItem element according to type"""
    return next(elem_val for elem_val in self.dropdown_items()
                if out_item_type in elem_val.item_type)

  def is_item_exists(self, out_item_type):
    """Check if element enable on dropdown and return Bool, by comparing
    icon type.
    Return bool
    """
    return any(elem_val.item_type for elem_val in self.dropdown_items()
               if out_item_type in elem_val.item_type)

  def is_item_enabled(self, out_item_type):
    """Check if element enable on dropdown.
    Return bool if element found
    If element not found raise exception
    """
    return self.get_dropdown_item(out_item_type).enabled


class DropdownMenuItem(Element):
  """Class for dropdown item"""
  _locators = constants.locator.CommonDropdownMenu
  _elements = constants.element.DropdownMenuItemTypes

  def __init__(self, driver, locator_or_element):
    super(DropdownMenuItem, self).__init__(driver, locator_or_element)
    self._enabled = None
    self._item_type = ""

  @property
  def item_type(self):
    """Item type defined by class of icon"""
    if not self._item_type:
      icon = selenium_utils.get_element_by_element_safe(
          self.element, self._locators.DROPDOWN_ITEM_ICON_CSS)
      if icon:
        icon_type = icon.get_attribute("class")
        self._item_type = next(
            (v for k, v in self._elements.__dict__.iteritems()
             if not k.startswith("_") and v in icon_type),
            icon_type)
    return self._item_type

  @property
  def enabled(self):
    """Return True if DropdownMenu Item enabled"""
    if not self._enabled:
      self._enabled = selenium_utils.is_element_enabled(self.element)
    return self._enabled
