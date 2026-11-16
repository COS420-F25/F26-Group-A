import { slotId, hourLabel, sortSlots, formatRange, summarizeSlots } from '../slots.js';

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

test('formatRange writes the start and the end hour', () => {
  expect(formatRange(9, 11)).toBe('9 AM to 11 AM');
  expect(formatRange(22, 24)).toBe('10 PM to 12 AM');
});

describe('summarizeSlots', () => {
  test('joins hours that touch and splits hours that do not', () => {
    expect(summarizeSlots(['Mon-09', 'Mon-10', 'Mon-13', 'Tue-14'])).toEqual([
      { day: 'Mon', ranges: ['9 AM to 11 AM', '1 PM to 2 PM'] },
      { day: 'Tue', ranges: ['2 PM to 3 PM'] },
    ]);
  });

  test('puts days in week order and sorts the hours', () => {
    const result = summarizeSlots(['Sun-08', 'Mon-10', 'Mon-09']);
    expect(result.map((d) => d.day)).toEqual(['Mon', 'Sun']);
    expect(result[0].ranges).toEqual(['9 AM to 11 AM']);
  });

  test('gives an empty list for no slots', () => {
    expect(summarizeSlots([])).toEqual([]);
  });

  test('ignores slots with an unknown day and repeated slots', () => {
    expect(summarizeSlots(['Xyz-09', 'Mon-09', 'Mon-09'])).toEqual([
      { day: 'Mon', ranges: ['9 AM to 10 AM'] },
    ]);
  });
});
