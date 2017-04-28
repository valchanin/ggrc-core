# Copyright (C) 2017 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Sets up Flask app."""

from collections import Iterable

import re
from logging import getLogger
from logging.config import dictConfig as setup_logging

from flask import Flask
from flask.ext.sqlalchemy import get_debug_queries
from flask.ext.sqlalchemy import SQLAlchemy
from tabulate import tabulate
from sqlalchemy import event

from ggrc import db
from ggrc import extensions
from ggrc import notifications
from ggrc import settings


setup_logging(settings.LOGGING)

# pylint: disable=invalid-name
logger = getLogger(__name__)


app = Flask('ggrc', instance_relative_config=True)  # noqa: valid constant name
app.config.from_object(settings)
if "public_config" not in app.config:
  app.config.public_config = {}

for key in settings.exports:
  app.config.public_config[key] = app.config[key]

# Configure Flask-SQLAlchemy for app
db.app = app
db.init_app(app)

# This should be imported after db.init_app id performed.
# Imported so it can be used with getattr.
from ggrc import contributions  # noqa  # pylint: disable=unused-import,wrong-import-position


@app.before_request
def _ensure_session_teardown():
  """Ensure db.session is correctly removed

  Occasionally requests are terminated without calling the teardown methods,
  namely with DeadlineExceededError on App Engine.
  """
  if db.session.registry.has():
    db.session.remove()


@app.before_request
def setup_user_timezone_offset():
  """Setup user timezon for current request

  It will setup from request header `X-UserTimezoneOffset`
  offset will be sent in minutes.
  """
  from flask import request
  from flask import g
  g.user_timezone_offset = request.headers.get("X-UserTimezoneOffset")


def init_models(app_):
  import ggrc.models
  ggrc.models.init_app(app_)


def configure_flask_login(app_):
  import ggrc.login
  ggrc.login.init_app(app_)


def configure_webassets(app_):
  """Add basic webassets configuration."""
  from ggrc import assets
  app_.jinja_env.add_extension('webassets.ext.jinja2.assets')
  app_.jinja_env.assets_environment = assets.environment


def configure_jinja(app_):
  """Add basic jinja configuration."""
  app_.jinja_env.add_extension('jinja2.ext.autoescape')
  app_.jinja_env.autoescape = True
  app_.jinja_env.add_extension('jinja2.ext.with_')
  app_.jinja_env.add_extension('hamlpy.ext.HamlPyExtension')


def init_services(app_):
  import ggrc.services
  ggrc.services.init_all_services(app_)


def init_cloud_endpoints():
  """Start cloud_endpoints wsgi server."""
  if not getattr(settings, "APP_ENGINE", False):
    # endpoints module is not even importable with no GAE environment
    return None

  from ggrc.services import cloud_endpoints as ce

  return ce.start()


def init_views(app_):
  import ggrc.views
  ggrc.views.init_all_views(app_)


def init_extension_blueprints(app_):
  for extension_module in extensions.get_extension_modules():
    if hasattr(extension_module, 'blueprint'):
      app_.register_blueprint(extension_module.blueprint)


ACTIONS = ['after_insert', 'after_delete', 'after_update']


def runner(mapper, content, target):  # pylint:disable=unused-argument
  """Collect all reindex models in session"""
  import ggrc.fulltext
  from ggrc.fulltext.mixin import Indexed
  ggrc.indexer = ggrc.fulltext.get_indexer()
  db.session.reindex_set = getattr(db.session, "reindex_set", set())
  getters = ggrc.indexer.indexer_rules.get(target.__class__.__name__) or []
  for getter in getters:
    to_index_list = getter(target)
    if not isinstance(to_index_list, Iterable):
      to_index_list = [to_index_list]
    for to_index in to_index_list:
      db.session.reindex_set.add(to_index)
  if isinstance(target, Indexed):
    db.session.reindex_set.add(target)


def init_indexer():
  """Indexing initialization procedure"""
  import ggrc.fulltext
  from ggrc.fulltext.mixin import Indexed
  from ggrc.models import all_models
  ggrc.indexer = ggrc.fulltext.get_indexer()

  for model in all_models.all_models:
    for action in ACTIONS:
      event.listen(model, action, runner)
    if not issubclass(model, Indexed):
      continue
    for sub_model in model.mro():
      for rule in getattr(sub_model, "AUTO_REINDEX_RULES", []):
        ggrc.indexer.indexer_rules[rule.model].append(rule.rule)


def init_permissions_provider():
  from ggrc.rbac import permissions
  permissions.get_permissions_provider()


def init_extra_listeners():
  """Initializes listeners for additional services"""
  from ggrc.automapper import register_automapping_listeners
  from ggrc.snapshotter.listeners import register_snapshot_listeners
  register_automapping_listeners()
  register_snapshot_listeners()


def _enable_debug_toolbar():
  """Enable flask debug toolbar for benchmarking requests."""
  if getattr(settings, "FLASK_DEBUGTOOLBAR", False):
    from flask_debugtoolbar import DebugToolbarExtension
    DebugToolbarExtension(app)


def _enable_jasmine():
  """Set jasmine sources and specs if it's enabled.

  Jasmine is used for javascript tests and is not installed on the production
  environment, that is why we must check if it enabled before tying to import
  it.
  """
  if getattr(settings, "ENABLE_JASMINE", False):
    from flask.ext.jasmine import Asset
    from flask.ext.jasmine import Jasmine
    # Configure Flask-Jasmine, for dev mode unit testing
    jasmine = Jasmine(app)

    jasmine.sources(
        Asset("dashboard-js"),
        Asset("dashboard-js-spec-helpers"),
        Asset("dashboard-js-templates"))

    jasmine.specs(
        Asset("dashboard-js-specs"))


def _display_sql_queries():
  """Set up display database queries

  This function makes sure we display the sql queries if the record setting is
  enabled.
  """
  report_type = getattr(settings, "SQLALCHEMY_RECORD_QUERIES", False)
  valid_types = ('count', 'slow', 'all')
  if report_type:
    if report_type not in valid_types:
      raise Exception("""Invalid SQLALCHEMY_RECORD_QUERIES value specified.
        Possible options: {}""".format(', '.join(valid_types)))

    # pylint: disable=unused-variable
    @app.after_request
    def display_queries(response):
      """Display database queries

      Prints out SQL queries, EXPLAINs for queries above slow_threshold, and
      a final count of queries after every HTTP request
      """
      slow_threshold = 0.5  # EXPLAIN queries that ran for more than 0.5s
      queries = get_debug_queries()
      logger.info("Total queries: %s", len(queries))
      if report_type == 'count':
        return response
      # We have to copy the queries list below otherwise queries executed
      # in the for loop will be appended causing an endless loop
      for query in queries[:]:
        if report_type == 'slow' and query.duration < slow_threshold:
          continue
        logger.info(
            "%.8f %s\n%s\n%s",
            query.duration,
            query.context,
            query.statement,
            query.parameters)
        is_select = bool(re.match('SELECT', query.statement, re.I))
        if query.duration > slow_threshold and is_select:
          try:
            statement = "EXPLAIN " + query.statement
            engine = SQLAlchemy().get_engine(app)
            result = engine.execute(statement, query.parameters)
            logger.info(tabulate(result.fetchall(), headers=result.keys()))
          except:  # pylint: disable=bare-except
            logger.warning("Statement failed: %s", statement, exc_info=True)
      return response


init_models(app)
configure_flask_login(app)
configure_webassets(app)
configure_jinja(app)
init_services(app)
cloud_endpoints = init_cloud_endpoints()
init_views(app)
init_extension_blueprints(app)
init_indexer()
init_permissions_provider()
init_extra_listeners()
notifications.register_notification_listeners()

_enable_debug_toolbar()
_enable_jasmine()
_display_sql_queries()
