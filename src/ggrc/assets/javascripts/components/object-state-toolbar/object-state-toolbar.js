/*!
 Copyright (C) 2017 Google Inc., authors, and contributors
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import {SWITCH_TO_ERROR_PANEL, SHOW_INVALID_FIELD} from '../../events/eventTypes';
import template from './object-state-toolbar.mustache';

(function (can, GGRC) {
  'use strict';

  var tag = 'object-state-toolbar';
  var activeStates = ['In Progress', 'Rework Needed', 'Not Started'];
  // Helper function - might be some util/helpers method
  function checkIsCurrentUserVerifier(verifiers) {
    return verifiers
      .filter(function (verifier) {
        return verifier.id === GGRC.current_user.id;
      }).length;
  }
  /**
   * Object State Toolbar Component allowing Object state modification
   */
  GGRC.Components('objectStateToolbar', {
    tag: tag,
    template: template,
    viewModel: {
      define: {
        updateState: {
          get: function () {
            return this.attr('hasVerifiers') ? 'In Review' : 'Completed';
          }
        },
        isCurrentUserVerifier: {
          get: function () {
            return checkIsCurrentUserVerifier(this.attr('verifiers'));
          }
        },
        hasVerifiers: {
          get: function () {
            return this.attr('verifiers').length;
          }
        },
        hasErrors: {
          get: function () {
            return this.attr('instance.preconditions_failed') ||
              this.attr('instance.hasValidationErrors');
          }
        },
        isDisabled: {
          get: function () {
            return !!this.attr('instance._disabled') ||
              this.attr('hasErrors') ||
              this.attr('instance.isPending');
          }
        }
      },
      verifiers: [],
      instance: {},
      isActiveState: function () {
        return activeStates.includes(this.attr('instance.status'));
      },
      isInProgress: function () {
        return this.attr('instance.status') === 'In Progress';
      },
      isInReview: function () {
        return this.attr('instance.status') === 'In Review';
      },
      hasPreviousState: function () {
        return !!this.attr('instance.previousStatus');
      },
      changeState: function (newState, isUndo) {
        if (this.attr('isDisabled')) {
          if (this.attr('instance.hasValidationErrors')) {
            this.attr('instance').dispatch(SWITCH_TO_ERROR_PANEL);
            this.attr('instance').dispatch(SHOW_INVALID_FIELD);
          }
          return;
        }

        newState = newState || this.attr('updateState');
        this.dispatch({
          type: 'onStateChange',
          state: newState,
          undo: isUndo
        });
      }
    }
  });
})(window.can, window.GGRC);
