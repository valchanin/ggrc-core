/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {getRole} from '../plugins/utils/acl-utils';

(function (can) {
  can.Model.Cacheable('CMS.Models.Context', {
    root_object: 'context',
    root_collection: 'contexts',
    category: 'contexts',
    findAll: '/api/contexts',
    findOne: '/api/contexts/{id}',
    create: 'POST /api/contexts',
    update: 'PUT /api/contexts/{id}',
    destroy: 'DELETE /api/contexts/{id}',
    attributes: {
      context: 'CMS.Models.Context.stub',
      related_object: 'CMS.Models.get_stub',
      user_roles: 'CMS.Models.UserRole.stubs',
    },
  }, {});

  can.Model.Cacheable('CMS.Models.Program', {
    root_object: 'program',
    root_collection: 'programs',
    category: 'programs',
    findAll: '/api/programs',
    findOne: '/api/programs/{id}',
    create: 'POST /api/programs',
    update: 'PUT /api/programs/{id}',
    destroy: 'DELETE /api/programs/{id}',
    mixins: [
      'unique_title',
      'ca_update',
      'timeboxed',
      'accessControlList',
      'base-notifications',
    ],
    is_custom_attributable: true,
    isRoleable: true,
    attributes: {
      context: 'CMS.Models.Context.stub',
      owners: 'CMS.Models.Person.stubs',
      modified_by: 'CMS.Models.Person.stub',
      object_people: 'CMS.Models.ObjectPerson.stubs',
      people: 'CMS.Models.Person.stubs',
      related_sources: 'CMS.Models.Relationship.stubs',
      related_destinations: 'CMS.Models.Relationship.stubs',
      objectives: 'CMS.Models.Objective.stubs',
      sections: 'CMS.Models.get_stubs',
      directives: 'CMS.Models.Directive.stubs',
      controls: 'CMS.Models.Control.stubs',
      audits: 'CMS.Models.Audit.stubs',
    },
    programRoles: ['Program Managers', 'Program Editors', 'Program Readers'],
    orderOfRoles: ['Program Managers', 'Program Editors', 'Program Readers'],
    tree_view_options: {
      attr_view: GGRC.mustache_path + '/programs/tree-item-attr.mustache',
      attr_list: [
        {
          attr_title: 'Manager',
          attr_name: 'owner',
          attr_sort_field: 'authorizations.0.person.name|email',
        },
      ].concat(can.Model.Cacheable.attr_list.filter(function (attr) {
        return attr.attr_name !== 'owner';
      })).concat([
        {attr_title: 'Reference URL', attr_name: 'reference_url'},
        {attr_title: 'Effective Date', attr_name: 'start_date'},
        {attr_title: 'Last Deprecated Date', attr_name: 'end_date'},
      ]),
      add_item_view: GGRC.mustache_path + '/base_objects/tree_add_item.mustache',
    },
    sub_tree_view_options: {
      default_filter: ['Standard'],
    },
    links_to: {
      System: {},
      Process: {},
      Facility: {},
      OrgGroup: {},
      Vendor: {},
      Project: {},
      DataAsset: {},
      AccessGroup: {},
      Product: {},
      Market: {},
    },
    defaults: {
      status: 'Draft',
    },
    statuses: ['Draft', 'Deprecated', 'Active'],
    init: function () {
      this.validateNonBlank('title');
      this._super.apply(this, arguments);
    },
  }, {
    readOnlyProgramRoles: function () {
      const allowedRoles = ['Superuser', 'Administrator', 'Editor'];
      if (allowedRoles.indexOf(GGRC.current_user.system_wide_role) > -1) {
        return false;
      }
      const programManagerRole = getRole('Program', 'Program Managers').id;

      return this.access_control_list.filter((acl) => {
        return acl.person_id === GGRC.current_user.id &&
               acl.ac_role_id === programManagerRole;
      }).length === 0;
    },
  });

  can.Model.Cacheable('CMS.Models.Option', {
    root_object: 'option',
    findAll: 'GET /api/options',
    findOne: 'GET /api/options/{id}',
    create: 'POST /api/options',
    update: 'PUT /api/options/{id}',
    destroy: 'DELETE /api/options/{id}',
    root_collection: 'options',
    cache_by_role: {},
    for_role: function (role) {
      let self = this;

      if (!this.cache_by_role[role]) {
        this.cache_by_role[role] =
          this.findAll({role: role}).then(function (options) {
            self.cache_by_role[role] = options;
            return options;
          });
      }
      return $.when(this.cache_by_role[role]);
    },
  }, {});

  can.Model.Cacheable('CMS.Models.Objective', {
    root_object: 'objective',
    root_collection: 'objectives',
    category: 'objectives',
    title_singular: 'Objective',
    title_plural: 'Objectives',
    findAll: 'GET /api/objectives',
    findOne: 'GET /api/objectives/{id}',
    create: 'POST /api/objectives',
    update: 'PUT /api/objectives/{id}',
    destroy: 'DELETE /api/objectives/{id}',
    mixins: [
      'ownable',
      'unique_title',
      'ca_update',
      'accessControlList',
      'base-notifications',
      'relatedAssessmentsLoader',
    ],
    is_custom_attributable: true,
    isRoleable: true,
    attributes: {
      context: 'CMS.Models.Context.stub',
      modified_by: 'CMS.Models.Person.stub',
      sections: 'CMS.Models.get_stubs',
      controls: 'CMS.Models.Control.stubs',
      object_people: 'CMS.Models.ObjectPerson.stubs',
      related_sources: 'CMS.Models.Relationship.stubs',
      related_destinations: 'CMS.Models.Relationship.stubs',
      objective_objects: 'CMS.Models.ObjectObjective.stubs',
    },
    tree_view_options: {
      attr_view: GGRC.mustache_path + '/objectives/tree-item-attr.mustache',
      attr_list: can.Model.Cacheable.attr_list.concat([
        {
          attr_title: 'Last Assessment Date',
          attr_name: 'last_assessment_date',
          order: 45, // between State and Primary Contact
        },
        {attr_title: 'Reference URL', attr_name: 'reference_url'},
      ]),
      display_attr_names: ['title', 'owner', 'status', 'last_assessment_date',
        'updated_at'],
      add_item_view: GGRC.mustache_path + '/snapshots/tree_add_item.mustache',
      create_link: true,
      show_related_assessments: true,
      // draw_children: true,
      start_expanded: false,
    },
    sub_tree_view_options: {
      default_filter: ['Control'],
    },
    defaults: {
      status: 'Draft',
    },
    statuses: ['Draft', 'Deprecated', 'Active'],
    init: function () {
      this.validateNonBlank('title');
      this._super.apply(this, arguments);
    },
  }, {});

  can.Model.Cacheable('CMS.Models.Label', {
    root_object: 'label',
    root_collection: 'labels',
    title_singular: 'Label',
    title_plural: 'Labels',
    findOne: 'GET /api/labels/{id}',
    findAll: 'GET /api/labels',
    update: 'PUT /api/labels/{id}',
    destroy: 'DELETE /api/labels/{id}',
    create: 'POST /api/labels',
  }, {});

  can.Model.Cacheable('CMS.Models.Event', {
    root_object: 'event',
    root_collection: 'events',
    findAll: 'GET /api/events',
    list_view_options: {
      find_params: {
        __include: 'revisions',
      },
    },
    attributes: {
      modified_by: 'CMS.Models.Person.stub',
    },
  }, {});

  can.Model.Cacheable('CMS.Models.Role', {
    root_object: 'role',
    root_collection: 'roles',
    findAll: 'GET /api/roles',
    findOne: 'GET /api/roles/{id}',
    update: 'PUT /api/roles/{id}',
    destroy: 'DELETE /api/roles/{id}',
    create: 'POST /api/roles',
    scopes: [
      'Private Program',
      'Workflow',
      'System',
    ],
    defaults: {
      permissions: {
        read: [],
        update: [],
        create: [],
        'delete': [],
      },
    },
  }, {
    allowed: function (operation, objectOrClass) {
      let cls = typeof objectOrClass === 'function' ?
        objectOrClass : objectOrClass.constructor;
      return !!~can.inArray(cls.model_singular, this.permissions[operation]);
    },
    not_system_role: function () {
      return this.attr('scope') !== 'System';
    },
    permission_summary: function () {
      let RoleList = {
        ProgramOwner: 'Program Manager',
        ProgramEditor: 'Program Editor',
        ProgramReader: 'Program Reader',
        Mapped: 'No Role',
        Owner: 'Manager',
      };
      if (RoleList[this.name]) {
        return RoleList[this.name];
      }
      return this.name;
    },
  });

  can.Model.Cacheable('CMS.Models.MultitypeSearch', {}, {});

  can.Model.Cacheable('CMS.Models.BackgroundTask', {
    root_object: 'background_task',
    root_collection: 'background_tasks',
    findAll: 'GET /api/background_tasks',
    findOne: 'GET /api/background_tasks/{id}',
    update: 'PUT /api/background_tasks/{id}',
    destroy: 'DELETE /api/background_tasks/{id}',
    create: 'POST /api/background_tasks',
    scopes: [],
    defaults: {},
  }, {
    poll: function () {
      let dfd = new $.Deferred();
      let self = this;
      let wait = 2000;

      function _poll() {
        self.refresh().then(function (task) {
          // Poll until we either get a success or a failure:
          if (['Success', 'Failure'].indexOf(task.status) < 0) {
            setTimeout(_poll, wait);
          } else {
            dfd.resolve(task);
          }
        });
      }
      _poll();
      return dfd;
    },
  });

  CMS.Models.get_instance = function (objectType, objectId, paramsOrObject) {
    let model;
    let params = {};
    let instance;
    let href;

    if (typeof objectType === 'object' || objectType instanceof can.Stub) {
      // assume we only passed in params_or_object
      paramsOrObject = objectType;
      if (!paramsOrObject) {
        return null;
      }
      if (paramsOrObject instanceof can.Model) {
        objectType = paramsOrObject.constructor.shortName;
      } else if (paramsOrObject instanceof can.Stub) {
        objectType = paramsOrObject.type;
      } else if (!paramsOrObject.selfLink && paramsOrObject.type) {
        objectType = paramsOrObject.type;
      } else {
        href = paramsOrObject.selfLink || paramsOrObject.href;
        objectType = can.map(
            window.cms_singularize(/^\/api\/(\w+)\//.exec(href)[1]).split('_'),
            can.capitalize
          ).join('');
      }
      objectId = paramsOrObject.id;
    }

    model = CMS.Models[objectType];

    if (!model) {
      return null;
    }

    if (!objectId) {
      return null;
    }

    if (!!paramsOrObject) {
      if ($.isFunction(paramsOrObject.serialize)) {
        $.extend(params, paramsOrObject.serialize());
      } else {
        $.extend(params, paramsOrObject || {});
      }
    }

    instance = model.findInCacheById(objectId);
    if (!instance) {
      if (params.selfLink) {
        params.id = objectId;
        instance = new model(params);
      } else {
        instance = new model({
          id: objectId,
          href: (paramsOrObject || {}).href,
        });
      }
    }
    return instance;
  };

  CMS.Models.get_stub = function (object) {
    let instance = CMS.Models.get_instance(object);
    if (!instance) {
      return;
    }
    return instance.stub();
  };

  CMS.Models.get_stubs = function (objects) {
    return new can.Stub.List(
      can.map(CMS.Models.get_instances(objects), function (obj) {
        if (!obj || !obj.stub) {
          console.warn('`Models.get_stubs` instance has no stubs ', arguments);
          return;
        }
        return obj.stub();
      }));
  };

  CMS.Models.get_instances = function (objects) {
    let i;
    let instances = [];
    if (!objects) {
      return [];
    }
    for (i = 0; i < objects.length; i++) {
      instances[i] = CMS.Models.get_instance(objects[i]);
    }
    return instances;
  };

  CMS.Models.get_link_type = function (instance, attr) {
    let type;
    let model;

    type = instance[attr + '_type'];
    if (!type) {
      model = instance[attr] && instance[attr].constructor;
      if (model) {
        type = model.shortName;
      } else if (instance[attr]) {
        type = instance[attr].type;
      }
    }
    return type;
  };
})(window.can);
