/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

describe('GGRC.Components.addIssueButton', function () {
  'use strict';

  var Component;
  var viewModel;
  var events;
  var CurrentPageUtils;

  beforeAll(function () {
    Component = GGRC.Components.get('addIssueButton');
    events = Component.prototype.events;
    CurrentPageUtils = GGRC.Utils.CurrentPage;
  });

  beforeEach(function () {
    viewModel = GGRC.Components.getViewModel('addIssueButton');
  });

  describe('on "{window} modal:success" event', function () {
    var handler;
    var that;
    var relatedInstance;

    beforeEach(function () {
      that = {
        viewModel: viewModel
      };
      relatedInstance = viewModel.attr('relatedInstance');
      handler = events['{window} modal:success'].bind(that);
      spyOn(relatedInstance, 'dispatch');
    });

    describe('in case of Issue instance', function () {
      var issueWidgetName = 'Issue';
      var fakeIssueInstance;
      var fakePageInstance = {
        type: 'TYPE',
        id: 'ID'
      };

      beforeEach(function () {
        spyOn(CMS.Models, 'Issue');
        fakeIssueInstance = new CMS.Models.Issue();
        spyOn(CurrentPageUtils, 'initCounts');
        spyOn(GGRC, 'page_instance').and.returnValue(fakePageInstance);
      });

      it('should dispatch refreshInstance event ' +
        'and update Issues tab counts',
        function () {
          handler({}, {}, fakeIssueInstance);
          expect(CurrentPageUtils.initCounts).toHaveBeenCalledWith(
            [issueWidgetName],
            fakePageInstance.type,
            fakePageInstance.id
          );
          expect(relatedInstance.dispatch)
            .toHaveBeenCalledWith('refreshInstance');
        }
      );
    });
  });
});
