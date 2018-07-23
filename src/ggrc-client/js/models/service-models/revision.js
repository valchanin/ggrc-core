/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Cacheable from '../cacheable';

/**
 * A model holding data and metadata describing a particular revision of
 * some business object at a particular point, i.e. the business object's
 * state.
 *
 * This is useful for e.g. reconstruction of an object's change history.
 */
export default Cacheable('CMS.Models.Revision', {
  root_object: 'revision',
  root_collection: 'revisions',

  // NOTE: only read API methods, because Revisions should not be modified
  // by the client directly
  findAll: '/api/revisions',
  findOne: '/api/revisions/{id}',

  mixins: [],
  attributes: {},
}, {});
