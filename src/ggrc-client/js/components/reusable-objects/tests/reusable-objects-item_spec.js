/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import Component from '../reusable-objects-item.js';

describe('reusable-object-item component', ()=> {
  describe('events', ()=> {
    let viewModel;
    let events;
    beforeEach(()=> {
      viewModel = new can.Map({
        instance: {},
      });
      events = Component.prototype.events;
    });

    describe('"{viewModel} isChecked" event handler', ()=> {
      let handler;
      beforeEach(()=> {
        handler = events['{viewModel} isChecked'];
      });

      it('pushes instance to the list if isChecked is true', ()=> {
        viewModel.attr('selectedList', []);

        handler(viewModel, null, true);

        let index = viewModel.attr('selectedList')
          .indexOf(viewModel.attr('instance'));
        expect(index).toBe(0);
      });

      it('removes instance from the list if isChecked is false', ()=> {
        let selectedList = [
          viewModel.attr('instance'),
          {id: 'another'},
        ];
        viewModel.attr('selectedList', selectedList);

        handler(viewModel, null, false);

        let index = viewModel.attr('selectedList')
          .indexOf(viewModel.attr('instance'));
        expect(index).toBe(-1);
        expect(viewModel.attr('selectedList.length')).toBe(1);
      });
    });

    describe('"{viewModel.selectedList} change" event handler', ()=> {
      let handler;
      beforeEach(()=> {
        handler = events['{viewModel.selectedList} change'];
      });

      it('turns ON isChecked flag if instance is in list', ()=> {
        let list = [
          {id: 1},
          viewModel.attr('instance'),
          {id: 2},
        ];
        viewModel.attr('isChecked', false);

        handler.call({viewModel}, list);

        expect(viewModel.attr('isChecked')).toBe(true);
      });

      it('turns OFF isChecked flag if instance is not in list', ()=> {
        let list = [
          {id: 1},
          {id: 2},
        ];
        viewModel.attr('isChecked', true);

        handler.call({viewModel}, list);

        expect(viewModel.attr('isChecked')).toBe(false);
      });
    });
  });
});
