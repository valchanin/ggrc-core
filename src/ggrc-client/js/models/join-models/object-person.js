/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Join from './join';
import Person from '../business-models/person';
import Cacheable from '../cacheable';

export default Join('CMS.Models.ObjectPerson', {
  root_object: 'object_person',
  root_collection: 'object_people',
  findAll: 'GET /api/object_people',
  create: 'POST /api/object_people',
  update: 'PUT /api/object_people/{id}',
  destroy: 'DELETE /api/object_people/{id}',
  join_keys: {
    personable: Cacheable,
    person: Person,
  },
  attributes: {
    context: 'CMS.Models.Context.stub',
    modified_by: 'CMS.Models.Person.stub',
    person: 'CMS.Models.Person.stub',
    personable: 'CMS.Models.get_stub',
  },
}, {});
