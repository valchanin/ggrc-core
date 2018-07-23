/*
  Copyright (C) 2018 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import * as issueTrackerUtils from '../../../plugins/utils/issue-tracker-utils';
import {makeFakeInstance} from '../../../../js_specs/spec_helpers';
import Cacheable from '../../cacheable';

describe('can.Model.Mixin.issueTracker', () => {
  let Mixin;

  beforeAll(function () {
    GGRC.ISSUE_TRACKER_ENABLED = true;
    Mixin = CMS.Models.Mixins.issueTracker;
  });

  describe('initIssueTracker() method', () => {
    let method;

    beforeAll(() => {
      method = Mixin.prototype.initIssueTracker;
      GGRC.ISSUE_TRACKER_ENABLED = false;
    });

    it('should show issue tracker if globally enabled and' +
       ' turn off by default', () => {
      GGRC.ISSUE_TRACKER_ENABLED = true;
      const stub = makeFakeInstance({model: Cacheable})();

      spyOn(issueTrackerUtils, 'initIssueTrackerObject');
      method.apply(stub);

      expect(issueTrackerUtils.initIssueTrackerObject.calls.count()).toEqual(1);
      const callArgs = issueTrackerUtils.initIssueTrackerObject
        .calls.mostRecent().args;

      expect(callArgs[1].enabled).toEqual(false); // turn off by default
      expect(callArgs[2]).toEqual(true); // show issue tracker controls
    });

    it('should show issue tracker if globally enabled and' +
       ' set up default values', () => {
      GGRC.ISSUE_TRACKER_ENABLED = true;
      const config = {
        hotlist_id: '766459',
        enabled: true,
      };

      const stub = makeFakeInstance({
        model: Cacheable,
        staticProps: {
          buildIssueTrackerConfig() {
            return config;
          },
        },
      })();

      spyOn(issueTrackerUtils, 'initIssueTrackerObject');
      method.apply(stub);

      expect(issueTrackerUtils.initIssueTrackerObject.calls.count()).toEqual(1);
      const callArgs = issueTrackerUtils.initIssueTrackerObject
        .calls.mostRecent().args;

      expect(callArgs[1]).toEqual(config);
      expect(callArgs[2]).toEqual(true); // show issue tracker controls
    });


    it('should hide issue tracker if globally disabled and' +
       ' turn off by default', () => {
      GGRC.ISSUE_TRACKER_ENABLED = false;
      const stub = makeFakeInstance({model: Cacheable})();

      spyOn(issueTrackerUtils, 'initIssueTrackerObject');
      method.apply(stub);

      expect(issueTrackerUtils.initIssueTrackerObject.calls.count()).toEqual(0);
      expect(stub.attr('issue_tracker.enabled')).toBeFalsy();
    });
  });
});
