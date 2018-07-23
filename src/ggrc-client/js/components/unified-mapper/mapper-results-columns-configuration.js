/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../tree/tree-header-selector';
import '../tree/tree-visible-column-checkbox';
import tmpl from './templates/mapper-results-columns-configuration.mustache';
import * as TreeViewUtils from '../../plugins/utils/tree-view-utils';
import DisplayPrefs from '../../models/local-storage/display-prefs';

export default can.Component.extend({
  tag: 'mapper-results-columns-configuration',
  template: tmpl,
  viewModel: {
    define: {
      selectedColumns: {
        set(newValue, setValue) {
          setValue(newValue);
          this.initializeColumns();
        },
      },
      availableColumns: {
        set(newValue, setValue) {
          setValue(newValue);
          this.initializeColumns();
        },
      },
    },
    modelType: '',
    selectedColumns: [],
    availableColumns: [],
    columns: {},
    displayPrefs: null,
    init() {
      this.initializeColumns();
      DisplayPrefs.getSingleton().then((displayPrefs) => {
        this.attr('displayPrefs', displayPrefs);
      });
    },
    getModel() {
      return CMS.Models[this.attr('modelType')];
    },
    initializeColumns() {
      const selectedColumns = this.attr('selectedColumns');
      const availableColumns = this.attr('availableColumns');
      const columns = TreeViewUtils
        .getVisibleColumnsConfig(availableColumns, selectedColumns);

      this.attr('columns', columns);
    },
    setColumns() {
      const selectedNames = this.attr('columns')
        .attr()
        .filter((item) => item.selected)
        .map((item) => item.name);

      const columns =
        TreeViewUtils.setColumnsForModel(
          this.getModel().model_singular,
          selectedNames,
          this.attr('displayPrefs')
        );

      this.attr('selectedColumns', columns.selected);
    },
    stopPropagation(context, el, ev) {
      ev.stopPropagation();
    },
  },
});
