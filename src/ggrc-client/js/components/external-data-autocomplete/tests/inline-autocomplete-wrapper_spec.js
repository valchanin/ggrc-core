/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import Cacheable from '../../../models/cacheable';
import Component from '../inline-autocomplete-wrapper';
import {makeFakeInstance} from '../../../../js_specs/spec_helpers';

describe('inline-autocomplete-wrapper component', ()=> {
  let viewModel;
  let instance;
  let path;
  beforeEach(()=> {
    instance = makeFakeInstance({model: Cacheable})({id: 25});
    path = 'testPath';

    viewModel = new (can.Map.extend(Component.prototype.viewModel))({
      instance,
      path,
    });
  });

  describe('viewModel', ()=> {
    describe('setItem() method', ()=> {
      beforeEach(()=> {
        spyOn(viewModel, 'updateTextValue');
        spyOn(viewModel, 'updateTransient');
      });

      describe('when argument is empty', ()=> {
        it('clears value', ()=> {
          instance.attr(path, {});

          viewModel.setItem('');

          expect(instance.attr(path)).toBe(null);
        });

        it('does not update text', ()=> {
          viewModel.setItem('');
          expect(viewModel.updateTextValue).not.toHaveBeenCalled();
        });

        it('updates transient', ()=> {
          viewModel.setItem('');
          expect(viewModel.updateTransient).toHaveBeenCalled();
        });
      });

      describe('when argument is not empty', ()=> {
        describe('object', ()=> {
          let item;
          beforeEach(()=> {
            item = {
              test: true,
            };
          });

          it('updates value', ()=> {
            instance.attr(path, {});

            viewModel.setItem(item);

            expect(instance.attr(path).serialize()).toEqual(item);
          });

          it('updates text', ()=> {
            viewModel.setItem(item);

            expect(viewModel.updateTextValue).toHaveBeenCalledWith(item);
          });

          it('updates transient', ()=> {
            viewModel.setItem(item);
            expect(viewModel.updateTransient).toHaveBeenCalled();
          });
        });

        describe('string', ()=> {
          let item;
          beforeEach(()=> {
            item = 'testValue';
          });

          it('does not update value', ()=> {
            instance.attr(path, null);

            viewModel.setItem(item);

            expect(instance.attr(path)).toBe(null);
          });

          it('updates transient', ()=> {
            viewModel.setItem(item);
            expect(viewModel.updateTransient).toHaveBeenCalled();
          });
        });
      });
    });

    describe('setCustomAttribute() method', ()=> {
      let instance;
      let item;

      beforeEach(function () {
        const caDefs = [{id: 1}];
        instance = makeFakeInstance({model: CMS.Models.Control})({
          custom_attribute_definitions: caDefs,
        });
        item = new can.Map({test: true});
        viewModel.attr('instance', instance);
      });

      it('sets person id for custom attribute', ()=> {
        const cadId = 1;
        item.attr('id', 123);
        viewModel.setCustomAttribute(item, cadId);
        expect(instance.customAttr(cadId).value).toBe(item.attr('id'));
      });

      it('updates text', ()=> {
        const cadId = 1;
        spyOn(viewModel, 'updateTextValue');
        viewModel.setCustomAttribute(item, cadId);
        expect(viewModel.updateTextValue).toHaveBeenCalledWith(item);
      });
    });

    describe('updateTextValue() method', ()=> {
      it('sets "displayProp" value if argument is object', ()=> {
        viewModel.attr('displayProp', 'test');
        viewModel.attr('textValue', null);

        viewModel.updateTextValue(new can.Map({
          test: 'testTextValue',
        }));

        expect(viewModel.attr('textValue')).toBe('testTextValue');
      });

      it('sets argument if argument is not object', ()=> {
        viewModel.attr('textValue', null);

        viewModel.updateTextValue('testTextValue');

        expect(viewModel.attr('textValue')).toBe('testTextValue');
      });
    });

    describe('updateTransient() method', ()=> {
      it('creates "_transient" property if it not exist or empty', ()=> {
        instance.attr('_transient', null);

        viewModel.updateTransient('test');

        expect(instance.attr('_transient')).toBeTruthy();
      });

      it('set argument to "_transient" property by path', ()=> {
        instance.attr('_transient', null);

        viewModel.updateTransient('test');

        expect(instance.attr('_transient.testPath')).toBe('test');
      });
    });
  });
});
