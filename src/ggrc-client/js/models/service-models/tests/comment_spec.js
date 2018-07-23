/*
  Copyright (C) 2018 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {makeFakeInstance} from '../../../../js_specs/spec_helpers';
import Comment from '../comment';

describe('Comment model', function () {
  'use strict';

  describe('updateDescription() method', function () {
    let comment;
    let dfdSave;
    let eventObj;
    let method;
    let $element;
    let trigger;

    beforeEach(function () {
      $element = $('<div />');
      comment = makeFakeInstance({model: Comment})();
      method = comment.updateDescription.bind(comment);

      trigger = spyOn($.prototype, 'trigger');

      eventObj = $.Event('on-save');
      eventObj.oldVal = '';
      eventObj.newVal = '';

      spyOn(comment, 'refresh').and.returnValue(
        new can.Deferred().resolve());
      dfdSave = new can.Deferred();
      spyOn(comment, 'save').and.returnValue(dfdSave);
    });

    it('saves the instance\'s new description', function () {
      comment.attr('description', 'old description');
      eventObj.newVal = 'new description';

      method(comment, $element, eventObj);

      expect(comment.save).toHaveBeenCalled();
      expect(comment.attr('description')).toEqual('new description');
    });

    it('displays a success notification on success', function () {
      method(comment, $element, eventObj);
      dfdSave.resolve();
      expect(trigger).toHaveBeenCalledWith(
        'ajax:flash', {success: 'Saved.'}
      );
    });

    it('keeps the instance\'s original description on failure', function () {
      comment.attr('description', 'old description');
      eventObj.newVal = 'new description';
      eventObj.oldVal = 'old description';

      method(comment, $element, eventObj);
      dfdSave.reject('Server error');

      expect(comment.attr('description')).toEqual('old description');
    });

    it('displays an error notification on failure', function () {
      method(comment, $element, eventObj);
      dfdSave.reject('Server error');
      expect(trigger).toHaveBeenCalledWith(
        'ajax:flash', {error: 'There was a problem with saving.'}
      );
    });
  });

  describe('display_name() method', function () {
    let fakeComment;
    let method;

    beforeEach(function () {
      fakeComment = new can.Map({});
      method = Comment.prototype.display_name.bind(fakeComment);
    });

    it('returns an empty string if comment does not have a description set',
      function () {
        let result;
        fakeComment.attr('description', undefined);
        result = method();
        expect(result).toEqual('');
      }
    );

    it('returns comment\'s description if the latter exists', function () {
      let result;
      fakeComment.attr('description', 'The comment content.');
      result = method();
      expect(result).toEqual('The comment content.');
    });
  });
});
