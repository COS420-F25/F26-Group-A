import { initialState, roundReducer } from '@groups/groupRoundReducer.js';

const round = {
  roundNumber: 1,
  status: 'draft',
  groups: [
    { id: 'g1', name: 'Group 1', memberIds: ['a', 'b'], reviewed: true },
    { id: 'g2', name: 'Group 2', memberIds: ['c'], reviewed: false },
  ],
  unplaced: [{ uid: 'd', reason: 'noOverlap' }],
  removed: [],
  lastChange: '',
};

const loaded = roundReducer(initialState, { type: 'load', round });

test('move places an unplaced student and records the last change', () => {
  const next = roundReducer(loaded, { type: 'move', uid: 'd', toGroupId: 'g2', name: 'Tom Brown' });
  expect(next.round.groups[1].memberIds).toEqual(['c', 'd']);
  expect(next.round.unplaced).toEqual([]);
  expect(next.round.lastChange).toBe('Moved Tom Brown to Group 2');
});

test('undo puts the round back the way it was', () => {
  const moved = roundReducer(loaded, { type: 'move', uid: 'a', toGroupId: 'g2', name: 'A' });
  const undone = roundReducer(moved, { type: 'undo' });
  expect(undone.round).toEqual(round);
  expect(undone.history).toHaveLength(0);
});

test('toggleReviewed marks and unmarks a group', () => {
  const marked = roundReducer(loaded, { type: 'toggleReviewed', groupId: 'g2' });
  expect(marked.round.groups[1].reviewed).toBe(true);
  expect(marked.round.lastChange).toBe('Marked Group 2 as reviewed');
});

test('remove takes a student out of this round', () => {
  const next = roundReducer(loaded, { type: 'remove', uid: 'b', name: 'B' });
  expect(next.round.groups[0].memberIds).toEqual(['a']);
  expect(next.round.removed).toEqual(['b']);
});

test('addGroup adds an empty group with the next number', () => {
  const next = roundReducer(loaded, { type: 'addGroup' });
  expect(next.round.groups[2]).toMatchObject({ id: 'g3', name: 'Group 3', memberIds: [] });
});

test('rematch keeps "asked for hours" on students who are still unplaced', () => {
  const asked = roundReducer(loaded, { type: 'askedForHours', uid: 'd', askedAt: '2026-11-14T12:00:00Z' });
  const next = roundReducer(asked, {
    type: 'rematch',
    groups: round.groups,
    unplaced: [{ uid: 'd', reason: 'noOverlap' }],
  });
  expect(next.round.unplaced[0].askedAt).toBe('2026-11-14T12:00:00Z');
});
