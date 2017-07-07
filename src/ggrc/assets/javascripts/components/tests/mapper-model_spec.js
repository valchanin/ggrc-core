/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

describe('GGRC.Models.MapperModel', function () {
  'use strict';

  var mapper;

  beforeEach(function () {
    mapper = GGRC.Models.MapperModel();
  });

  describe('get() for mapper.types', function () {
    var originalInScopeModels;
    beforeAll(function () {
      originalInScopeModels = GGRC.Utils.Snapshots.inScopeModels;
      GGRC.Utils.Snapshots.inScopeModels = ['test1', 'test2'];
    });
    afterAll(function () {
      GGRC.Utils.Snapshots.inScopeModels = originalInScopeModels;
    });

    beforeEach(function () {
      spyOn(GGRC.Mappings, 'getMappingTypes').and.returnValue('types');
      mapper.attr('object', 'testObject');
    });

    it('correctly calls getMappingTypes it is search', function () {
      var result;
      mapper.attr('search_only', true);
      result = mapper.attr('types');
      expect(GGRC.Mappings.getMappingTypes).toHaveBeenCalledWith('testObject',
        ['TaskGroupTask', 'TaskGroup', 'CycleTaskGroupObjectTask'], []);
      expect(result).toEqual('types');
    });

    it('correctly calls getMappingTypes it is not search', function () {
      var result;
      mapper.attr('search_only', false);
      result = mapper.attr('types');
      expect(GGRC.Mappings.getMappingTypes).toHaveBeenCalledWith('testObject',
        [], ['test1', 'test2']);
      expect(result).toEqual('types');
    });
  });

  describe('get() for mapper.parentInstance', function () {
    beforeEach(function () {
      spyOn(CMS.Models, 'get_instance')
        .and.returnValue('parentInstance');
    });

    it('returns parentInstance', function () {
      var result = mapper.attr('parentInstance');
      expect(result).toEqual('parentInstance');
    });
  });

  describe('get() for mapper.useSnapshots', function () {
    it('use Snapshots if using in-scope model', function () {
      var result;
      spyOn(GGRC.Utils.Snapshots, 'isInScopeModel')
        .and.returnValue(true);
      result = mapper.attr('useSnapshots');
      expect(result).toEqual(true);
    });

    it('use Snapshots in case Assessment generation',
      function () {
        var result;
        spyOn(GGRC.Utils.Snapshots, 'isInScopeModel')
          .and.returnValue(false);
        mapper.attr('assessmentGenerator', true);
        result = mapper.attr('useSnapshots');
        expect(result).toEqual(true);
      });

    it('do not use Snapshots if not an in-scope model ' +
      'and not in assessment generation mode', function () {
      var result;
      spyOn(GGRC.Utils.Snapshots, 'isInScopeModel')
        .and.returnValue(false);
      mapper.attr('assessmentGenerator', false);
      result = mapper.attr('useSnapshots');
      expect(result).toEqual(false);
    });
  });

  describe('allowedToCreate() method', function () {
    it('returns true if not in a search mode and is not an in-scope model',
      function () {
        var result;
        mapper.attr('search_only', false);
        spyOn(GGRC.Utils.Snapshots, 'isInScopeModel')
          .and.returnValue(false);
        result = mapper.allowedToCreate();
        expect(result).toEqual(true);
      });

    it('returns false if in a search mode and is an in-scope model',
      function () {
        var result;
        mapper.attr('search_only', true);
        spyOn(GGRC.Utils.Snapshots, 'isInScopeModel')
          .and.returnValue(true);
        result = mapper.allowedToCreate();
        expect(result).toEqual(false);
      });

    it('returns false if in a search mode and is not an in-scope model',
      function () {
        var result;
        mapper.attr('search_only', true);
        spyOn(GGRC.Utils.Snapshots, 'isInScopeModel')
          .and.returnValue(false);
        result = mapper.allowedToCreate();
        expect(result).toEqual(false);
      });

    it('returns false if not in a search mode and is an in-scope model',
      function () {
        var result;
        mapper.attr('search_only', false);
        spyOn(GGRC.Utils.Snapshots, 'isInScopeModel')
          .and.returnValue(true);
        result = mapper.allowedToCreate();
        expect(result).toEqual(false);
      });
  });

  describe('showWarning() method', function () {
    it('returns false if is an in-scope model', function () {
      var result;
      spyOn(GGRC.Utils.Snapshots, 'isInScopeModel')
        .and.returnValue(true);
      result = mapper.showWarning();
      expect(result).toEqual(false);
    });

    it('returns false if is in assessment generation mode',
      function () {
        var result;
        spyOn(GGRC.Utils.Snapshots, 'isInScopeModel')
          .and.returnValue(false);
        mapper.attr('assessmentGenerator', true);
        result = mapper.showWarning();
        expect(result).toEqual(false);
      });

    it('returns false if is in a search mode', function () {
      var result;
      spyOn(GGRC.Utils.Snapshots, 'isInScopeModel')
        .and.returnValue(false);
      mapper.attr('search_only', true);
      result = mapper.showWarning();
      expect(result).toEqual(false);
    });

    it('returns true if source object is a Snapshot parent', function () {
      var result;
      spyOn(GGRC.Utils.Snapshots, 'isInScopeModel')
        .and.returnValue(false);
      spyOn(GGRC.Utils.Snapshots, 'isSnapshotParent')
        .and.callFake(function (v) {
          return v === 'o';
        });
      mapper.attr('object', 'o');
      mapper.attr('type', 't');
      result = mapper.showWarning();
      expect(result).toEqual(true);
    });

    it('returns true if is mapped object is a ' +
      'Snapshot parent', function () {
      var result;
      spyOn(GGRC.Utils.Snapshots, 'isInScopeModel')
        .and.returnValue(false);
      spyOn(GGRC.Utils.Snapshots, 'isSnapshotParent')
        .and.callFake(function (v) {
          return v === 't';
        });
      mapper.attr('object', 'o');
      mapper.attr('type', 't');
      result = mapper.showWarning();
      expect(result).toEqual(true);
    });
  });

  describe('modelFromType() method', function () {
    it('returns undefined if no models', function () {
      var result = mapper.modelFromType('program');
      expect(result).toEqual(undefined);
    });

    it('returns model config by model value', function () {
      var result;
      var types = {
        governance: {
          items: [{
            value: 'v1'
          }, {
            value: 'v2'
          }, {
            value: 'v3'
          }]
        }
      };

      spyOn(GGRC.Mappings, 'getMappingTypes')
        .and.returnValue(types);

      result = mapper.modelFromType('v2');
      expect(result).toEqual(types.governance.items[1]);
    });
  });

  describe('onSubmit() method', function () {
    it('sets true to mapper.afterSearch', function () {
      mapper.attr('afterSearch', false);
      mapper.onSubmit();
      expect(mapper.attr('afterSearch')).toEqual(true);
    });
  });
});
