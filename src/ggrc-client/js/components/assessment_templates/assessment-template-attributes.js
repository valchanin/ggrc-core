/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

/*
 * Assessment template main component
 *
 * It collects fields data and it transforms them into appropriate
 * format for saving
 */
export default can.Component.extend({
  tag: 'assessment-template-attributes',
  viewModel: {
    fields: new can.List(),
    types: new can.List([{
      type: 'Text',
      name: 'Text',
      text: 'Enter description',
    }, {
      type: 'Rich Text',
      name: 'Rich Text',
      text: 'Enter description',
    }, {
      type: 'Date',
      name: 'Date',
      text: 'MM/DD/YYYY',
    }, {
      type: 'Checkbox',
      name: 'Checkbox',
      text: '',
    }, {
      type: 'Dropdown',
      name: 'Dropdown',
      text: 'Enter values separated by comma',
    }, {
      type: 'Map:Person',
      name: 'Person',
      text: '',
    }]),

    /**
     * A handler for when a user removes a Custom Attribute Definition.
     *
     * It removes the corresponding CA definition object from the list to
     * keep it in sync with the definitions listed in DOM.
     *
     * @param {CustomAttributeDefinition} instance -
     *   the definition that was removed
     * @param {jQuery.Element} $el - the source of the event `ev`
     * @param {jQuery.Event} ev - the onRemove event object
     */
    fieldRemoved: function (instance, $el, ev) {
      let idx = _.findIndex(this.fields, {title: instance.title});
      if (idx >= 0) {
        this.fields.splice(idx, 1);
      } else {
        console.warn('The list of CAD doesn\'t contain item with "' +
          instance.title + '" title');
      }
    },
  },
  events: {
    inserted: function () {
      let el = $(this.element);
      let list = el.find('.sortable-list');
      list.sortable({
        items: 'li.sortable-item',
        placeholder: 'sortable-placeholder',
      });
      list.find('.sortable-item').disableSelection();
    },
    '.sortable-list sortstop': function () {
      let el = $(this.element);
      let sortables = el.find('li.sortable-item');
      // It's not nice way to rely on DOM for sorting,
      // but it was easiest for implementation
      this.viewModel.fields.replace(_.map(sortables,
        function (item) {
          return $(item).data('field');
        }
      ));
    },
  },
});
