import { setValueToObject } from './utils';

test('setValueToObject', () => {
  const o: any = { tooltip: { trigger: 'aaa' } };
  setValueToObject(o, 'a', 'name');
  expect(o['name']).toBe('a');

  setValueToObject(o.tooltip, 'none', 'trigger');
  expect(o.tooltip.trigger).toBe('none');
});
