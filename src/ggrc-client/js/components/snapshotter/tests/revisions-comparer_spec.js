/*
  Copyright (C) 2018 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import * as caUtils from '../../../plugins/utils/ca-utils';
import Component from '../revisions-comparer';
import RefreshQueue from '../../../models/refresh_queue';
import Revision from '../../../models//service-models/revision';

describe('GGRC.Components.revisionsComparer', function () {
  let viewModel;

  beforeEach(function () {
    viewModel = new (can.Map.extend(Component.prototype.viewModel));
  });

  describe('prepareInstances() method', function () {
    let fakeData;
    let method; // the method under test

    beforeEach(function () {
      method = viewModel.prepareInstances.bind(viewModel);
      fakeData = [
        {
          id: 1,
          content: new can.Map({id: 1}),
          resource_type: 'Control',
        }, {
          id: 2,
          content: new can.Map({id: 1}),
          resource_type: 'Control',
        },
      ];
    });

    it('returns instances of necessary type and with isRevision', function () {
      let result = method(fakeData);
      result.forEach(function (item) {
        expect(item.instance instanceof CMS.Models.Control).toBeTruthy();
        expect(item.instance.type).toBe('Control');
        expect(item.instance.isRevision).toBe(true);
      });
    });

    it('returns the same length of instances as passed', function () {
      let result = method(fakeData);
      expect(result.length).toBe(fakeData.length);
    });

    it('returns the same data as passed with extra properties', function () {
      let result = method(fakeData);
      let data = fakeData;
      result.forEach(function (item, index) {
        expect(item.instance.id).toEqual(data[index].content.id);
      });
    });

    it('adds person stubs to access control list items', function () {
      let result;

      fakeData.forEach(function (item, i) {
        let acl = new can.List([
          {ac_role_id: i * 10, person_id: i * 10},
          {ac_role_id: i * 10, person_id: i * 10},
        ]);
        item.content.attr('access_control_list', acl);
      });

      result = method(fakeData);

      function checkAclItem(item) {
        expect(item.person).toBeDefined();
        expect(item.person.type).toEqual('Person');
        expect(item.person.id).toEqual(item.person_id);
      }

      result.forEach(function (item) {
        item.instance.access_control_list.forEach(checkAclItem);
      });
    });
  });

  describe('getAttachmentsDfds() method', function () {
    let method;
    let revisions;

    beforeEach(function () {
      let prepareInstancesMethod = viewModel.prepareInstances
        .bind(viewModel);
      let fakeData = [
        {
          id: 1,
          content: new can.Map({id: 1}),
          resource_type: 'Control',
        }, {
          id: 2,
          content: new can.Map({id: 1}),
          resource_type: 'Control',
        },
      ];

      method = viewModel.getAttachmentsDfds.bind(viewModel);
      revisions = new can.List(prepareInstancesMethod(fakeData));
    });

    it('getAttachmentsDfds() should return 1 dfd', function () {
      let dfds;
      revisions[0].attr('instance').folder = 'EWheNKvwjhrcwWer';
      dfds = method(revisions);
      expect(dfds.length).toEqual(1);
    });

    it('getAttachmentsDfds() should return 2 dfds', function () {
      let dfds;
      revisions[0].attr('instance').folder = 'EWheNKvwjhrcwWer';
      revisions[1].attr('instance').folder = 'vewbetWhercwWer';
      dfds = method(revisions);
      expect(dfds.length).toEqual(2);
    });

    it('getAttachmentsDfds() should return empty array', function () {
      let dfds = method();
      expect(dfds.length).toEqual(0);
    });
  });

  describe('getRevisions() method', function () {
    let method;

    beforeEach(function () {
      method = viewModel.getRevisions;
    });

    it('when cache is empty doing ajax call for all revisions',
      function (done) {
        spyOn(Revision, 'findInCacheById').and.returnValue(undefined);

        spyOn(Revision, 'findAll').and.returnValue(
          can.Deferred().resolve([{id: 42}, {id: 11}])
        );

        spyOn(Revision, 'findOne').and.returnValue(
          can.Deferred().resolve({id: 42})
        );

        method(42, 11).then(function (result) {
          expect(result.length).toEqual(2);

          expect(Revision.findAll).toHaveBeenCalledWith({
            id__in: '42,11',
          });

          expect(Revision.findOne).not.toHaveBeenCalled();

          done();
        });
      });

    it('when in cache only one object doing findOne call',
      function (done) {
        spyOn(Revision, 'findInCacheById').and
          .returnValues({id: 42}, undefined);

        spyOn(Revision, 'findAll').and.returnValue(
          can.Deferred().resolve([{id: 42}, {id: 11}])
        );

        spyOn(Revision, 'findOne').and.returnValue(
          can.Deferred().resolve({id: 42})
        );

        method(42, 11).then(function (result) {
          expect(result.length).toEqual(2);

          expect(Revision.findAll).not.toHaveBeenCalled();

          expect(Revision.findOne).toHaveBeenCalledWith({id: 11});

          done();
        });
      });

    it('when cache contains all objects are not doing ajax call',
      function (done) {
        spyOn(Revision, 'findInCacheById').and.returnValues({id: 42}, {id: 11});

        spyOn(Revision, 'findAll').and.returnValue(
          can.Deferred().resolve([{id: 42}, {id: 11}])
        );

        spyOn(Revision, 'findOne').and.returnValue(
          can.Deferred().resolve({id: 42})
        );

        method(42, 11).then(function (result) {
          expect(result.length).toEqual(2);

          expect(Revision.findAll).not.toHaveBeenCalled();

          expect(Revision.findOne).not.toHaveBeenCalled();

          done();
        });
      });
  });

  describe('"loadACLPeople" method', () => {
    let Person;
    let method;
    let instance;

    beforeEach(() => {
      Person = CMS.Models.Person;
      method = viewModel.loadACLPeople;
      instance = new can.Map({
        access_control_list: [{
          person: {
            id: 1,
            type: 'Person',
          },
        }, {
          person: {
            id: 2,
            type: 'Person',
          },
        }],
      });

      spyOn(RefreshQueue.prototype, 'enqueue').and.callThrough();
      spyOn(RefreshQueue.prototype, 'trigger');
    });

    it('does ajax call for all people no one is in cache', () => {
      spyOn(Person, 'findInCacheById');

      method(instance);

      expect(RefreshQueue.prototype.enqueue.calls.count()).toEqual(2);
      expect(RefreshQueue.prototype.trigger).toHaveBeenCalled();
    });

    it('does ajax call for remain people when some people are in cache', () => {
      spyOn(Person, 'findInCacheById').and.callFake((id) => {
        return id === 1 ? {email: 'example@email.com'} : null;
      });

      method(instance);

      expect(RefreshQueue.prototype.enqueue.calls.count()).toEqual(1);
      expect(RefreshQueue.prototype.trigger).toHaveBeenCalled();
    });

    it('does not ajax call when all people are in cache', () => {
      let dfd = new can.Deferred();
      spyOn(Person, 'findInCacheById').and.callFake(() => {
        return {email: 'example@email.com'};
      });
      spyOn(can, 'Deferred').and.returnValue(dfd);
      spyOn(dfd, 'resolve');

      method(instance);

      expect(RefreshQueue.prototype.enqueue.calls.any()).toEqual(false);
      expect(RefreshQueue.prototype.trigger.calls.any()).toEqual(false);
      expect(dfd.resolve).toHaveBeenCalled();
    });
  });

  describe('"highlightCustomAttributes" method', () => {
    const titleSelector = '.info-pane__section-title';
    const valueSelector = '.inline__content';
    const highlightSelector = '.diff-highlighted';
    const attributeSelector = '.ggrc-form-item';

    let method;
    let revisions;

    beforeEach(() => {
      method = viewModel.highlightCustomAttributes.bind(viewModel);
      spyOn(viewModel, 'equalizeHeights');
    });

    it('prepares custom attributes', () => {
      revisions = [
        {
          instance: new can.Map(),
        }, {
          instance: new can.Map(),
        },
      ];
      let $target = $('<div/>');

      spyOn(caUtils, 'prepareCustomAttributes').and.returnValue([]);

      method($target, revisions);
      expect(caUtils.prepareCustomAttributes.calls.count()).toEqual(2);
    });

    describe('when attribute was updated', () => {
      let $target;

      beforeEach(() => {
        let ca0s = [{
          custom_attribute_id: 1,
          def: {
            title: 'title',
          },
          attribute_value: 'value',
        }, {
          custom_attribute_id: 2,
          def: {
            title: 'person attr',
          },
          attribute_value: 'Person',
          attribute_object_id: 3,
        }];

        let ca1s = [{
          custom_attribute_id: 1,
          def: {
            title: 'changed title',
          },
          attribute_value: 'changed value',
        }, {
          custom_attribute_id: 2,
          def: {
            title: 'person attr',
          },
          attribute_value: 'Person',
          attribute_object_id: 4,
        }];

        let index = 0;
        spyOn(caUtils, 'prepareCustomAttributes').and
          .callFake((defs, values) => {
            if (index === 0) {
              index++;
              return ca0s;
            }
            return ca1s;
          });

        $target = $(`<div>
                    <section class="info">
                      <global-custom-attributes>
                        <div class="ggrc-form-item">
                          <div class="info-pane__section-title"></div>
                          <div class="inline__content"></div>
                        </div>
                        <div class="ggrc-form-item">
                          <div class="info-pane__section-title"></div>
                          <div class="inline__content"></div>
                        </div>
                      </global-custom-attributes>
                    </section>
                    <section class="info">
                      <global-custom-attributes>
                        <div class="ggrc-form-item">
                          <div class="info-pane__section-title"></div>
                          <div class="inline__content"></div>
                        </div>
                        <div class="ggrc-form-item">
                          <div class="info-pane__section-title"></div>
                          <div class="inline__content"></div>
                        </div>
                      </global-custom-attributes>
                    </section>
                  </div>`);
      });

      it('highlights changed titles', () => {
        method($target, revisions);

        expect($target.find(`${titleSelector}${highlightSelector}`).length)
          .toEqual(2);
      });

      it('highlights changed values', () => {
        method($target, revisions);

        expect($target.find(`${valueSelector}${highlightSelector}`).length)
          .toEqual(4);
      });

      it('equlizes blocks heights', () => {
        method($target, revisions);
        expect(viewModel.equalizeHeights.calls.count()).toEqual(2);
      });
    });

    describe('when attribute was removed', () => {
      let $target;

      beforeEach(() => {
        let ca0s = [{
          custom_attribute_id: 1,
          def: {
            title: 'title',
          },
          attribute_value: 'value',
        }, {
          custom_attribute_id: 2,
          def: {
            title: 'ca2 title',
          },
          attribute_value: 'ca2 value',
        }];

        let ca1s = [{
          custom_attribute_id: 2,
          def: {
            title: 'ca2 title',
          },
          attribute_value: 'ca2 value',
        }];

        let index = 0;
        spyOn(caUtils, 'prepareCustomAttributes').and
          .callFake((defs, values) => {
            if (index === 0) {
              index++;
              return ca0s;
            }
            return ca1s;
          });

        $target = $(`<div>
                    <section class="info">
                      <global-custom-attributes>
                        <div class="ggrc-form-item">
                          <div class="info-pane__section-title">title</div>
                          <div class="inline__content">value</div>
                        </div>
                        <div class="ggrc-form-item">
                          <div class="info-pane__section-title">ca2 title</div>
                          <div class="inline__content">ca2 value</div>
                        </div>
                      </global-custom-attributes>
                    </section>

                    <section class="info">
                      <global-custom-attributes>
                        <div class="ggrc-form-item">
                          <div class="info-pane__section-title">ca2 title</div>
                          <div class="inline__content">ca2 value</div>
                        </div>
                      </global-custom-attributes>
                    </section>
                  </div>`);
      });

      it('adds empty html block to the right panel', () => {
        let emptyBlockSelector =
          `global-custom-attributes:last ${attributeSelector}:first:empty`;
        method($target, revisions);
        expect($target.find(emptyBlockSelector).length).toEqual(1);
      });

      it('highlights removed attribute title', () => {
        method($target, revisions);
        expect($target.find(`${titleSelector}${highlightSelector}`).length)
          .toEqual(1);
      });

      it('highlights removed attribute value', () => {
        method($target, revisions);
        expect($target.find(`${valueSelector}${highlightSelector}`).length)
          .toEqual(1);
      });

      it('equlizes blocks heights', () => {
        method($target, revisions);
        expect(viewModel.equalizeHeights.calls.count()).toEqual(2);
      });
    });

    describe('when all attributes were removed', () => {
      let $target;

      beforeEach(() => {
        let ca0s = [{
          custom_attribute_id: 1,
          def: {
            title: 'ca1 title',
          },
          attribute_value: 'ca1 value',
        }, {
          custom_attribute_id: 2,
          def: {
            title: 'ca2 title',
          },
          attribute_value: 'ca2 value',
        }];

        let ca1s = [];

        let index = 0;
        spyOn(caUtils, 'prepareCustomAttributes').and
          .callFake((defs, values) => {
            if (index === 0) {
              index++;
              return ca0s;
            }
            return ca1s;
          });

        $target = $(`<div>
                    <section class="info">
                      <global-custom-attributes>
                        <div class="ggrc-form-item">
                          <div class="info-pane__section-title">title</div>
                          <div class="inline__content">value</div>
                        </div>
                        <div class="ggrc-form-item">
                          <div class="info-pane__section-title">ca2 title</div>
                          <div class="inline__content">ca2 value</div>
                        </div>
                      </global-custom-attributes>
                    </section>

                    <section class="info">
                      <global-custom-attributes>
                      </global-custom-attributes>
                    </section>
                  </div>`);
      });

      it('adds empty html blocks to the right panel', () => {
        let emptyBlockSelector =
          `global-custom-attributes:last ${attributeSelector}:empty`;
        method($target, revisions);
        expect($target.find(emptyBlockSelector).length).toEqual(0);
      });

      it('highlights removed attributes title', () => {
        method($target, revisions);
        expect($target.find(`${titleSelector}${highlightSelector}`).length)
          .toEqual(2);
      });

      it('highlights removed attributes value', () => {
        method($target, revisions);
        expect($target.find(`${valueSelector}${highlightSelector}`).length)
          .toEqual(2);
      });

      it('equlizes blocks heights', () => {
        method($target, revisions);
        expect(viewModel.equalizeHeights.calls.count()).toEqual(2);
      });
    });

    describe('when attribute was added', () => {
      let $target;

      beforeEach(() => {
        let ca0s = [{
          custom_attribute_id: 2,
          def: {
            title: 'title',
          },
          attribute_value: 'value',
        }];

        let ca1s = [{
          custom_attribute_id: 1,
          def: {
            title: 'new attribute title',
          },
          attribute_value: 'new attribute value',
        }, {
          custom_attribute_id: 2,
          def: {
            title: 'title',
          },
          attribute_value: 'value',
        }];

        let index = 0;
        spyOn(caUtils, 'prepareCustomAttributes').and
          .callFake((defs, values) => {
            if (index === 0) {
              index++;
              return ca0s;
            }
            return ca1s;
          });

        $target = $(`<div>
                    <section class="info">
                      <global-custom-attributes>
                        <div class="ggrc-form-item">
                          <div class="info-pane__section-title">title</div>
                          <div class="inline__content"></div>
                        </div>
                      </global-custom-attributes>
                    </section>
                    <section class="info">
                      <global-custom-attributes>
                        <div class="ggrc-form-item">
                          <div class="info-pane__section-title">new title</div>
                          <div class="inline__content"></div>
                        </div>
                        <div class="ggrc-form-item">
                          <div class="info-pane__section-title">title</div>
                          <div class="inline__content"></div>
                        </div>
                      </global-custom-attributes>
                    </section>
                  </div>`);
      });

      it('adds empty html block to the left panel', () => {
        let emptyBlockSelector =
          `global-custom-attributes:first ${attributeSelector}:first:empty`;
        method($target, revisions);
        expect($target.find(emptyBlockSelector).length).toEqual(1);
      });

      it('highlights new attribute title', () => {
        method($target, revisions);
        expect($target.find(`${titleSelector}${highlightSelector}`).length)
          .toEqual(1);
      });

      it('highlights new attribute value', () => {
        method($target, revisions);
        expect($target.find(`${valueSelector}${highlightSelector}`).length)
          .toEqual(1);
      });

      it('equlizes blocks heights', () => {
        method($target, revisions);
        expect(viewModel.equalizeHeights.calls.count()).toEqual(2);
      });
    });
  });

  describe('"highlightCustomRoles" method', () => {
    const highlightSelector = '.diff-highlighted';
    const blockSelector = 'object-list';

    describe('compareRoleBlocks() method', () => {
      let $blockEmpty;
      let $blockNotEmpty;
      let $target;
      let $rolesPanes;

      beforeEach(() => {
        $blockEmpty = $(`<div>
                          <related-people-access-control-group>
                              <object-list>
                                <div class="object-list__item-empty">
                                  None
                                </div>
                              </object-list>
                          </related-people-access-control-group>
                        </div>`);
        $blockNotEmpty = $(`<div>
                            <related-people-access-control-group>
                              <object-list>
                                  <person-data>
                                  </person-data>
                              </object-list>
                            </related-people-access-control-group>
                          </div>`);
        $target = {find: () => {}};
      });

      it(`highlights blocks of grants if list of people was empty
        in the old revision`, () => {
          $rolesPanes = $blockEmpty.add($blockNotEmpty);
          spyOn($target, 'find').and.returnValue($rolesPanes);

          viewModel.highlightCustomRoles($target);

          expect($rolesPanes.find(`${blockSelector}${highlightSelector}`)
            .length).toEqual(2);
        });

      it(`highlights blocks of grants if list of people is empty
        in the new revision`, () => {
          $rolesPanes = $blockNotEmpty.add($blockEmpty);
          spyOn($target, 'find').and.returnValue($rolesPanes);

          viewModel.highlightCustomRoles($target);

          expect($rolesPanes.find(`${blockSelector}${highlightSelector}`)
            .length).toEqual(2);
        });
    });
  });
});
