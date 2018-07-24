/*
  Copyright (C) 2018 Google Inc., authors, and contributors <see AUTHORS file>
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import RefreshQueue from '../models/refresh_queue';
import * as businessModels from '../models/business-models';

const TOOLTIP_ITEMS_LIMIT = 5;

const viewModel = can.Map.extend({
  field: 'title',
  source: null,
  items: [],
  resultStr: '',
  showTooltip: true,
  init: function () {
    this.refreshItems();
  },
  refreshItems: function () {
    this.getItems()
      .then((data) => {
        let items = data.map((item) => item[this.attr('field')]);
        this.attr('items', items);

        if (this.attr('showTooltip')) {
          let resultStr = items
            .slice(0, TOOLTIP_ITEMS_LIMIT)
            .join('\n');

          resultStr += items.length > TOOLTIP_ITEMS_LIMIT ?
            `\n and ${items.length - TOOLTIP_ITEMS_LIMIT} more` : '';

          this.attr('resultStr', resultStr);
        }
      });
  },
  getItems: function () {
    let source = this.attr('source');
    let sourceList = can.isArray(source) ? source : can.makeArray(source);
    let deferred = can.Deferred();
    let readyItemsList;

    if (!sourceList.length) {
      return deferred.resolve([]);
    }

    readyItemsList = sourceList.filter((item) => item[this.attr('field')]);

    if (readyItemsList.length === sourceList.length) {
      deferred.resolve(sourceList);
    } else {
      this.loadItems(sourceList)
        .then(function (data) {
          deferred.resolve(data);
        })
        .fail(function () {
          deferred.resolve([]);
        });
    }

    return deferred;
  },
  loadItems: function (items) {
    const rq = new RefreshQueue();

    can.each(items, function (item) {
      rq.enqueue(businessModels[item.type].model(item));
    });

    return rq.trigger();
  },
});

export default viewModel;
