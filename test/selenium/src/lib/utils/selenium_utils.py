# Copyright (C) 2017 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
"""Utility functions for selenium."""

import logging
import time

from selenium.common import exceptions
from selenium.webdriver.common import action_chains
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from lib import constants, exception
from lib.constants import messages

LOGGER = logging.getLogger(__name__)


def _webdriver_wait(driver):
  """Common WebDriverWait logic with poll frequency."""
  return WebDriverWait(driver, constants.ux.MAX_USER_WAIT_SECONDS,
                       poll_frequency=constants.ux.POLL_FREQUENCY)


def hover_over_element(driver, element):
  """Move mouse pointer to element and hover."""
  action_chains.ActionChains(driver).move_to_element(element).perform()


def open_url(driver, url):
  """Open URL in current browser session if it hasn't been opened yet."""
  if driver.current_url != url:
    driver.get(url)


def refresh_page(driver):
  """Refresh Page in current browser session"""
  driver.refresh()


def switch_to_new_window(driver):
  """Wait until new window will be opened, have the number of windows handles
  increase and then switch to last opened window.
  """
  try:
    wait_until_condition(driver, EC.new_window_is_opened)
    driver.switch_to.window(driver.window_handles.pop())
  except:
    raise exceptions.NoSuchWindowException(
        messages.ExceptionsMessages.err_switch_to_new_window)


def wait_until_stops_moving(element):
  """Wait until element stops moving.
 Args: selenium.webdriver.remote.webelement.WebElement
 """
  prev_location = None
  timer_begin = time.time()
  while prev_location != element.location:
    prev_location = element.location
    time.sleep(0.1)
    if time.time() - timer_begin > constants.ux.ELEMENT_MOVING_TIMEOUT:
      raise exception.ElementMovingTimeout


def is_element_exist(driver, locator):
  """
  Args: driver (base.CustomDriver), locator (tuple)
  Return: True if element is exist, False if element is not exist.
  """
  try:
    driver.find_element(*locator)
    return True
  except exceptions.NoSuchElementException:
    return False


def get_when_visible(driver, locator):
  """
 Args: driver (base.CustomDriver), locator (tuple)
 Return: selenium.webdriver.remote.webelement.WebElement
 """
  return (_webdriver_wait(driver).
          until(EC.visibility_of_element_located(locator)))


def wait_until_condition(driver, condition):
  """Wait until given expected condition is met."""
  _webdriver_wait(driver).until(condition)


def wait_until_elements_present(driver, *locators):
  """Wait until all elements for given locators are present in DOM."""
  for locator in locators:
    wait_until_present(driver, locator)


def wait_until_present(driver, locator):
  """Wait until element for given locator is present in DOM."""
  wait_until_condition(driver, EC.presence_of_element_located(locator))


def wait_until_not_present(driver, locator):
  """Wait until no element(-s) for locator given are present in DOM."""
  wait_until_condition(driver, lambda d: len(d.find_elements(*locator)) == 0)


def get_when_all_visible(driver, locator):
  """Return elements by locator when all of them are visible.
 Args: driver (base.CustomDriver), locator (tuple)
 Return: selenium.webdriver.remote.webelement.WebElements
 """
  return (_webdriver_wait(driver).
          until(EC.visibility_of_all_elements_located(locator)))


def get_when_clickable(driver, locator):
  """
 Args: driver (base.CustomDriver), locator (tuple)
 Return: selenium.webdriver.remote.webelement.WebElement
 """
  return (_webdriver_wait(driver).
          until(EC.element_to_be_clickable(locator)))


def get_when_invisible(driver, locator):
  """
 Args: driver (base.CustomDriver), locator (tuple)
 Return: selenium.webdriver.remote.webelement.WebElement
 """
  return (_webdriver_wait(driver).
          until(EC.invisibility_of_element_located(locator)))


def wait_for_element_text(driver, locator, text):
  """
    Args: driver (base.CustomDriver), locator (tuple), text (str)
 """
  return (_webdriver_wait(driver).
          until(EC.text_to_be_present_in_element(locator, text)))


def scroll_to_page_bottom(driver):
  """Scroll to page bottom using JS.
 Args: driver (base.CustomDriver)
 """
  driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")


def is_value_in_attr(element, attr="class", value="active"):
  """Check if attribute value is present for given attribute.
 Args:
    element (selenium.webdriver.remote.webelement.WebElement)
    attr (basestring): attribute name e.g. "class"
    value (basestring): value in class attribute that
      indicates element is now active/opened
 Return: bool
 """
  attributes = element.get_attribute(attr)
  return value in attributes.split() if attributes != "" else False


def wait_until_alert_is_present(driver):
  """
 Wait until alert is present.
 Args: driver (base.CustomDriver)
 Return: selenium.webdriver.common.alert.Alert
 """
  return (WebDriverWait(driver, constants.ux.MAX_ALERT_WAIT).
          until(EC.alert_is_present()))


def handle_alert(driver, accept=False):
  """Wait until alert is present and make decision to accept or dismiss it."""
  try:
    wait_until_alert_is_present(driver)
    alert = driver.switch_to.alert
    if accept:
      alert.accept()
    else:
      alert.dismiss()
  except (exceptions.NoAlertPresentException, exceptions.TimeoutException):
    pass


def click_on_staleable_element(driver, el_locator):
  """Click element that can be modified between time we find it and when
 we click on it."""
  time_start = time.time()
  while time.time() - time_start < constants.ux.MAX_USER_WAIT_SECONDS:
    try:
      driver.find_element(*el_locator).click()
      break
    except exceptions.StaleElementReferenceException as err:
      LOGGER.error(err)
      time.sleep(0.1)
  else:
    raise exception.ElementNotFound(el_locator)


def scroll_into_view(driver, element):
  """Scroll page to element using JS."""
  driver.execute_script("return arguments[0].scrollIntoView();", element)
  # compensate for the header
  driver.execute_script(
      "window.scrollBy(0, -{});".format(constants.settings.SIZE_HEADER))
  return element


def wait_for_js_to_load(driver):
  """Wait until there all JS are completed."""
  return wait_until_condition(
      driver, lambda js: driver.execute_script("return jQuery.active") == 0)


def click_via_js(driver, element):
  """Click on element using JS."""
  driver.execute_script("arguments[0].click();", element)


def is_element_enabled(element):
  """Is this element and first parent and first level child elements is
  enabled, use when common WebDriver "isEnabled"  isn't working"""
  elements_to_check = [element, element.find_element_by_xpath("../.")]
  elements_to_check.extend(get_nested_elements(element))
  return all([el.is_enabled() and
              not is_value_in_attr(el, value="disabled")
              for el in elements_to_check])


def is_element_checked(driver, element):
  """Check DOM input element checked property using JS.
  Args: driver (base.CustomDriver), locator (tuple)
  Return: True if element is checked, False if element is not checked.
  """
  return driver.execute_script("return arguments[0].checked", element)


def get_nested_elements(element, all_nested=False):
  """Get nested elements of current element by Xpath. If all_nested=True,
  return all-levels nested elements
  """
  nested_locator = './*'
  if all_nested:
    nested_locator = './/*'
  return element.find_elements_by_xpath(nested_locator)


def get_element_by_element_safe(element, locator):
  """Get element from current element by locator.
  Return "None" if element not found
  """
  return next((el for el in element.find_elements(*locator)), None)
