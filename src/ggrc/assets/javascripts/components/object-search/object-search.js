/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, $) {
  'use strict';

  GGRC.Components('objectSearch', {
    tag: 'object-search',
    template: can.view(GGRC.mustache_path +
      '/components/object-search/object-search.mustache'),
    viewModel: function () {
      var data = {
        searchOnly: true,
        object: 'MultitypeSearch',
        type: 'Program'
      };

      return new GGRC.Models.MapperModel(can.extend(data, {
        isLoadingOrSaving: function () {
          return this.attr('is_loading');
        }
      }));
    },
    events: {
      inserted: function () {
        this.setModel();
        this.viewModel.attr('mapper').afterShown();
      },
      setModel: function () {
        var type = this.viewModel.attr('type');

        this.viewModel.attr(
          'model', this.viewModel.mapper.modelFromType(type));
      },
      '{mapper} type': function () {
        var mapper = this.viewModel.attr('mapper');
        mapper.attr('filter', '');
        mapper.attr('afterSearch', false);
        mapper.attr('relevant').replace([]);
        this.setModel();
        setTimeout(mapper.onSubmit.bind(mapper));
      }
    }
  });
})(window.can, window.can.$);
