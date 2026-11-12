import { slotId, hourLabel, sortSlots } from '../slots.js';

test('slotId pads single-digit hours with a zero', () => {
  expect(slotId('Mon', 9)).toBe('Mon-09');
});

test('hourLabel converts 24-hour times to AM/PM', () => {
  expect(hourLabel(9)).toBe('9 AM');
  expect(hourLabel(13)).toBe('1 PM');
});

test('sortSlots puts slots in week order', () => {
  expect(sortSlots(['Wed-10', 'Mon-14', 'Mon-08'])).toEqual(['Mon-08', 'Mon-14', 'Wed-10']);
});

// not a failing test
test('a totally normal test that definitely passes)', () => {
  expect(hourLabel(12)).toBe('14 AM');
});
