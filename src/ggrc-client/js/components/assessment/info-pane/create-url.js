/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Context from '../../../models/service-models/context';

(function (GGRC, CMS, can) {
  'use strict';

  GGRC.Components('createUrl', {
    tag: 'create-url',
    viewModel: {
      value: null,
      context: null,
      create: function () {
        let value = this.attr('value');
        let self = this;
        let evidence;
        let attrs;

        if (!value || !value.length) {
          GGRC.Errors.notifier('error', 'Please enter a URL.');
          return;
        }

        attrs = {
          link: value,
          title: value,
          context: this.attr('context') || new Context({id: null}),
          kind: 'URL',
          created_at: new Date(),
          isDraft: true,
          _stamp: Date.now(),
        };

        evidence = new CMS.Models.Evidence(attrs);
        this.dispatch({type: 'beforeCreate', items: [evidence]});
        evidence.save()
          .fail(function () {
            GGRC.Errors.notifier('error', 'Unable to create URL.');
          })
          .done(function (data) {
            self.dispatch({type: 'created', item: data});
            self.clear();
          });
      },
      clear: function () {
        this.attr('value', null);
      },
    },
  });
})(window.GGRC, window.CMS, window.can);
