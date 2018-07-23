/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Spinner from 'spin.js';
import Search from '../models/service-models/search';

export default can.Control({
  defaults: {
    filterable_items_selector: '[data-model]',
    spinner_while_filtering: false,
    spinner_style: {
      top: 100,
      left: 100,
      height: 50,
      width: 50,
      position: 'absolute',
    },
  },
  // static
}, {
  filter: function (str, extraParams, dfd) {
    let that = this;
    let spinner;
    let searchDfds = str ?
      [Search.search(str, extraParams)] : [$.when(null)];

    dfd && searchDfds.push(dfd);

    if (this.options.spinner_while_filtering) {
      spinner = new Spinner().spin();
      $(spinner.el).css(this.options.spinner_style);
      this.element.append(spinner.el);
    }
    return $.when.apply($, search_dfds).then(function (data) {
      let _filter = null;
      let ids = null;
      if (data) {
        _filter = that.options.model ?
          data.getResultsFor(that.options.model) : data;
        ids = data ? can.map(data.entries, function (v) {
          return v.id;
        }) : null;
      }
      that.last_filter_ids = ids;
      that.last_filter = _filter;
      that.redo_last_filter();
      spinner && spinner.stop();
      return ids;
    });
  },

  redo_last_filter: function (idToAdd) {
    idToAdd && this.last_filter_ids.push(idToAdd);
    let that = this;
    that.element.find(that.options.filterable_items_selector)
      .each(function () {
        let $this = $(this);

        if (that.last_filter_ids == null ||
            can.inArray($this.data('model').id, that.last_filter_ids) > -1) {
          $this.show();
        } else {
          $this.hide();
        }
      });
    return $.when(this.last_filter_ids);
  },
});
