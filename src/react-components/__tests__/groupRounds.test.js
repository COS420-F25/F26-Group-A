import {
  blockConflict,
  bySchedule,
  byScheduleAndInterests,
  getPublishWarnings,
  matchGroups,
  moveStudent,
  nextGroup,
  previewMove,
  reconcileRound,
  roundSummary,
  sharedTimes,
  slotLabel,
  readAvailability,
  studentsFromSurvey,
  unplacedReason,
} from '../utils/groupRounds.js';

const student = (uid, availability, extra = {}) => ({
  uid,
  name: extra.name ?? uid,
  availability,
  ifNeeded: [],
  tags: [],
  blockList: [],
  responded: true,
  ...extra,
});

describe('sharedTimes', () => {
  test('returns only the times every member is free, in week order', () => {
    const a = student('a', ['Thu-19', 'Mon-18', 'Wed-18']);
    const b = student('b', ['Mon-18', 'Wed-18', 'Fri-09']);
    expect(sharedTimes([a, b]).map((t) => t.slot)).toEqual(['Mon-18', 'Wed-18']);
  });

  test('marks a time as "if needed" when one member only marked it if needed', () => {
    const a = student('a', ['Mon-18', 'Thu-19']);
    const b = student('b', ['Mon-18'], { ifNeeded: ['Thu-19'] });
    expect(sharedTimes([a, b])).toEqual([
      { slot: 'Mon-18', ifNeeded: false },
      { slot: 'Thu-19', ifNeeded: true },
    ]);
  });

  test('slotLabel turns a slot into readable text', () => {
    expect(slotLabel('Mon-18')).toBe('Mon 6 PM');
  });
});

test('publish warnings use the existing timing and size rules and skip empty and one-member groups', () => {
  const regular = ['Mon-18', 'Wed-18'];
  const available = (uid) => student(uid, regular, { ifNeeded: ['Thu-19'] });
  const students = [
    available('a'), available('b'),
    student('short', ['Mon-18']), student('later', ['Sun-12']),
    student('solo', ['Mon-18']),
    student('fallback', [], { ifNeeded: ['Mon-18', 'Thu-19'] }),
    ...['c', 'd', 'e', 'f', 'g', 'h'].map(available),
  ];
  const groups = [
    { id: 'regular', name: 'Regular', memberIds: ['a', 'b'] },
    { id: 'short', name: 'Short', memberIds: ['a', 'short'] },
    { id: 'none', name: 'None', memberIds: ['b', 'later'] },
    { id: 'fallback', name: 'Fallback', memberIds: ['a', 'fallback'] },
    { id: 'large', name: 'Large', memberIds: ['c', 'd', 'e', 'f', 'g', 'h'] },
    { id: 'solo', name: 'Solo', memberIds: ['solo'] },
    { id: 'empty', name: 'Empty', memberIds: [] },
  ];
  const byId = Object.fromEntries(students.map((person) => [person.uid, person]));

  const { warnings, blockers } = getPublishWarnings(groups, byId);
  expect(warnings.map(({ id }) => id)).toEqual([
    'short-below-rule', 'none-no-shared-time', 'fallback-if-needed', 'large-over-size',
  ]);
  expect(blockers).toEqual([]);
});

describe('matchGroups', () => {
  const weekday = ['Mon-18', 'Wed-18', 'Thu-19'];

  test('puts students with shared times into groups of about 4', () => {
    const students = Array.from({ length: 8 }, (_, i) => student(`s${i}`, weekday));
    const { groups, unplaced } = matchGroups(students);
    expect(groups).toHaveLength(2);
    expect(groups.every((g) => g.memberIds.length === 4)).toBe(true);
    expect(unplaced).toEqual([]);
  });

  test('students who did not answer the survey go to "Needs a group"', () => {
    const students = [
      student('a', weekday),
      student('b', weekday),
      student('c', [], { responded: false }),
    ];
    const { unplaced } = matchGroups(students);
    expect(unplaced).toEqual([{ uid: 'c', reason: 'noResponse' }]);
  });

  test('a student who shares fewer than 2 times with every group is not placed', () => {
    const students = [
      student('a', weekday),
      student('b', weekday),
      student('c', weekday),
      student('sat', ['Sat-10', 'Sat-11']),
    ];
    const { groups, unplaced } = matchGroups(students);
    expect(unplaced).toEqual([{ uid: 'sat', reason: 'noOverlap' }]);
    expect(groups.flatMap((g) => g.memberIds)).not.toContain('sat');
  });

  test('never puts a student in a group with someone on their block list', () => {
    const students = [
      student('jane', weekday, { blockList: ['john'] }),
      student('john', weekday),
      student('x', weekday),
      student('y', weekday),
      student('z', weekday),
      student('w', weekday),
      student('v', weekday),
      student('u', weekday),
    ];
    const { groups } = matchGroups(students);
    for (const g of groups) {
      expect(g.memberIds.includes('jane') && g.memberIds.includes('john')).toBe(false);
    }
  });

  test('the interests strategy breaks ties by shared interests', () => {
    const me = student('me', weekday, { tags: ['Math'] });
    const mathFan = student('m', weekday, { tags: ['Math'] });
    const writer = student('w', weekday, { tags: ['Writing'] });
    const shared = sharedTimes([mathFan, me]);
    expect(byScheduleAndInterests(me, [mathFan], shared)).toBeGreaterThan(
      byScheduleAndInterests(me, [writer], shared)
    );
    expect(bySchedule(me, [mathFan], shared)).toBe(bySchedule(me, [writer], shared));
  });
});

describe('moving a student', () => {
  const people = {
    jane: student('jane', ['Tue-17', 'Thu-17', 'Mon-18'], { name: 'Jane Doe', blockList: ['john'] }),
    john: student('john', ['Tue-17', 'Thu-17', 'Thu-18'], { name: 'John Public' }),
    mary: student('mary', ['Tue-17', 'Thu-17'], { name: 'Mary Major' }),
    tom: student('tom', ['Thu-18', 'Mon-18'], { name: 'Tom Brown' }),
  };
  const groups = [
    { id: 'g1', name: 'Group 1', memberIds: ['jane'], reviewed: true },
    { id: 'g2', name: 'Group 2', memberIds: ['john'], reviewed: false },
    { id: 'g3', name: 'Group 3', memberIds: ['mary'], reviewed: false },
    { id: 'g4', name: 'Group 4', memberIds: ['tom'], reviewed: false },
  ];

  test('previewMove marks the best fit, the 2-time rule, and block list conflicts', () => {
    const options = previewMove(people.john, groups, people);
    const byGroup = Object.fromEntries(options.map((o) => [o.groupId, o]));

    expect(byGroup.g2).toBeUndefined();
    expect(byGroup.g3.status).toBe('ok');
    expect(byGroup.g3.bestFit).toBe(true);
    expect(byGroup.g3.shared.map((t) => t.slot)).toEqual(['Tue-17', 'Thu-17']);
    expect(byGroup.g4.status).toBe('belowRule');
    expect(byGroup.g1.status).toBe('conflict');
    expect(byGroup.g1.conflictWith.uid).toBe('jane');
    expect(options[0].groupId).toBe('g3');
  });

  test('a group that would go over 5 members is not the best fit when another group has room', () => {
    const big = { id: 'big', name: 'Big', memberIds: ['a', 'b', 'c', 'd', 'e'], reviewed: false };
    const small = { id: 'small', name: 'Small', memberIds: ['mary'], reviewed: false };
    const everyone = { ...people };
    for (const id of ['a', 'b', 'c', 'd', 'e']) everyone[id] = student(id, ['Tue-17', 'Thu-17', 'Thu-18']);
    const options = previewMove(people.john, [big, small], everyone);
    expect(options.find((o) => o.groupId === 'big')).toMatchObject({ overMax: true, bestFit: false });
    expect(options.find((o) => o.groupId === 'small').bestFit).toBe(true);
  });

  test('blockConflict works in both directions', () => {
    expect(blockConflict(people.john, [people.jane])?.uid).toBe('jane');
    expect(blockConflict(people.jane, [people.john])?.uid).toBe('john');
    expect(blockConflict(people.mary, [people.jane])).toBeNull();
  });

  test('moveStudent moves the student and un-reviews both changed groups', () => {
    const after = moveStudent(groups, 'jane', 'g3');
    expect(after[0]).toMatchObject({ memberIds: [], reviewed: false });
    expect(after[2]).toMatchObject({ memberIds: ['mary', 'jane'], reviewed: false });
    expect(after[1]).toBe(groups[1]);
  });

  test('nextGroup picks the next free number', () => {
    expect(nextGroup(groups)).toEqual({ id: 'g5', name: 'Group 5', memberIds: [], reviewed: false });
  });
});

describe('Needs a group list and summary', () => {
  test('unplacedReason explains why in plain words', () => {
    expect(unplacedReason(student('a', [], { responded: false }))).toMatch(/Didn't fill out the survey/);
    expect(unplacedReason(student('b', ['Sat-10', 'Sat-12']))).toBe(
      'Free only on Saturdays. No group shares that time.'
    );
  });

  test('reconcileRound adds students who answered after the round was saved', () => {
    const round = { groups: [{ id: 'g1', name: 'Group 1', memberIds: ['a', 'gone'] }], unplaced: [], removed: [] };
    const result = reconcileRound(round, [student('a', []), student('late', ['Mon-18'])]);
    expect(result.groups[0].memberIds).toEqual(['a']);
    expect(result.unplaced).toEqual([{ uid: 'late', reason: 'noOverlap' }]);
  });

  test('roundSummary counts placed students and reviewed groups', () => {
    const round = {
      groups: [
        { memberIds: ['a', 'b'], reviewed: true },
        { memberIds: ['c'], reviewed: false },
      ],
      unplaced: [{ uid: 'd' }],
    };
    expect(roundSummary(round, 4)).toEqual({ placed: 3, total: 4, needGroup: 1, reviewed: 1, groupCount: 2 });
  });
});

describe('reading survey answers', () => {
  const survey = {
    questions: [
      { id: 'q-int', type: 'interests' },
      { id: 'q-av', type: 'availability' },
      { id: 'q-block', type: 'blocklist' },
    ],
    targetStudentUids: [],
  };

  test('readAvailability reads the saved shape and older plain lists', () => {
    expect(readAvailability(survey, { answers: { 'q-av': { available: ['Mon-18'], ifNeeded: ['Tue-17'] } } })).toEqual({
      available: ['Mon-18'],
      ifNeeded: ['Tue-17'],
    });
    expect(readAvailability(survey, { answers: { 'q-av': ['Wed-09'] } })).toEqual({ available: ['Wed-09'], ifNeeded: [] });
    expect(readAvailability(survey, { answers: {} })).toEqual({ available: [], ifNeeded: [] });
  });

  test('studentsFromSurvey joins the class list with answers and keeps students who did not answer', () => {
    const roster = [
      { uid: 'a', name: 'Ann', email: 'a@x.edu' },
      { uid: 'b', name: 'Ben', email: 'b@x.edu' },
    ];
    const responses = [
      { uid: 'a', name: 'Ann', answers: { 'q-int': ['Math'], 'q-av': { available: ['Mon-18'], ifNeeded: [] }, 'q-block': ['b'] } },
    ];
    const [ann, ben] = studentsFromSurvey(survey, roster, responses);
    expect(ann).toMatchObject({ uid: 'a', responded: true, availability: ['Mon-18'], tags: ['Math'], blockList: ['b'] });
    expect(ben).toMatchObject({ uid: 'b', responded: false, availability: [] });
  });

  test('studentsFromSurvey only includes students the survey was sent to', () => {
    const roster = [
      { uid: 'a', name: 'Ann' },
      { uid: 'b', name: 'Ben' },
    ];
    const list = studentsFromSurvey({ ...survey, targetStudentUids: ['b'] }, roster, []);
    expect(list.map((s) => s.uid)).toEqual(['b']);
  });
});
