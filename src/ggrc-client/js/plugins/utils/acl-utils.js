/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

const ACL = GGRC.access_control_roles.reduce((aclMap, role) => {
  if (!aclMap[role.object_type]) {
    aclMap[role.object_type] = {};
  }

  aclMap[role.object_type][role.name] = role;

  // Hash by Ids
  aclMap.ids[role.id] = role;

  return aclMap;
}, {
  ids: {},
});

/**
 * Returns list of roles for specific type.
 *
 * @param {string} type - Type of object.
 * @return {Array}
 */
const getRolesForType = (type) => {
  let roles = ACL[type] ? ACL[type] : {};

  return Object.values(roles);
};

/**
 * Returns the role from global ACL.
 *
 * @param {string} type - Type of object for which is defined the role
 * @param {string} name - Role name
 * @return {object|null}
 */
const getRole = (type, name) => {
  return ACL[type] && ACL[type][name] ? ACL[type][name] : null;
};

/**
 * Returns the role from global ACL by ID.
 *
 * @param {number} id - Id of role.
 * @return {object|null}
 */
const getRoleById = (id) => {
  return ACL.ids[id];
};

/**
 * Compute a list of people that have `roleName` granted on `instance`.
 *
 * @param {Cacheable} instance - a model instance
 * @param {String} roleName - the name of the custom role
 *
 * @return {Array} - list of people
 */
function peopleWithRoleName(instance, roleName) {
  let modelRoles;
  let roleId;

  // get role ID by roleName
  modelRoles = _.filter(
    GGRC.access_control_roles,
    {object_type: instance.class.model_singular, name: roleName});

  if (modelRoles.length === 0) {
    console.warn('peopleWithRole: role not found for instance type');
    return new can.List([]);
  } else if (modelRoles.length > 1) {
    console.warn('peopleWithRole: found more than a single role');
    // We do not exit, as we have a reasonable fallback - picking
    // the first match.
  }

  roleId = modelRoles[0].id;

  return peopleWithRoleId(instance, roleId);
}

/**
 * Compute a list of people that have `roleId` granted on `instance`.
 *
 * @param {Cacheable} instance - a model instance
 * @param {String} roleId - the id of the custom role
 *
 * @return {Array} - list of people
 */
function peopleWithRoleId(instance, roleId) {
  return instance.attr('access_control_list')
    .filter((item) => item.ac_role_id === roleId)
    .map((aclItem) => {
      return {
        id: aclItem.person.id,
        type: aclItem.person.type,
        href: aclItem.person.href,
        name: aclItem.person_name,
        email: aclItem.person_email,
      };
    });
}

/**
 * Checks whether user is auditor in audit
 *
 * @param {Cacheable} audit - an audit instance
 * @param {Cacheable} user - a user instance
 *
 * @return {boolean}
 */
function isAuditor(audit, user) {
  if (audit.type !== 'Audit') {
    return false;
  }

  const auditor = getRole('Audit', 'Auditors');
  return audit.access_control_list.filter(
    (acl) => acl.ac_role_id === auditor.id &&
                 acl.person_id === user.id).length > 0;
}

export {
  peopleWithRoleName,
  peopleWithRoleId,
  getRolesForType,
  getRole,
  getRoleById,
  isAuditor,
};
