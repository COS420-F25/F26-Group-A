import '@testing-library/jest-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReviewGroups from '../content/ReviewGroups.jsx';

const user = { uid: 'prof' };
const survey = {
  id: 's1',
  title: 'Week 1',
  status: 'closed',
  questions: [
    { id: 'interests', type: 'interests' },
    { id: 'availability', type: 'availability' },
    { id: 'blocklist', type: 'blocklist' },
  ],
  targetStudentUids: [],
};
const roster = ['jane', 'john', 'mary', 'max', 'tom', 'joan'].map((uid) => ({
  uid,
  name: uid[0].toUpperCase() + uid.slice(1),
  email: `${uid}@x.edu`,
}));
const answer = (uid, available, extra = {}) => ({
  uid,
  name: uid[0].toUpperCase() + uid.slice(1),
  answers: {
    interests: extra.tags ?? [],
    availability: { available, ifNeeded: extra.ifNeeded ?? [] },
    blocklist: extra.blockList ?? [],
  },
});
const responses = [
  answer('jane', ['Tue-17', 'Thu-17', 'Mon-18'], { tags: ['Math'], blockList: ['john'] }),
  answer('john', ['Tue-17', 'Thu-17', 'Thu-18']),
  answer('mary', ['Tue-17', 'Thu-17']),
  answer('max', ['Tue-17', 'Thu-17', 'Mon-18']),
  answer('joan', ['Sat-10', 'Sat-11']),
];

const draft = {
  roundNumber: 1,
  status: 'draft',
  groups: [
    { id: 'g1', name: 'Group 1', memberIds: ['jane', 'max'], reviewed: true },
    { id: 'g2', name: 'Group 2', memberIds: ['john'], reviewed: false },
    { id: 'g3', name: 'Group 3', memberIds: ['mary'], reviewed: false },
  ],
  unplaced: [
    { uid: 'tom', reason: 'noResponse' },
    { uid: 'joan', reason: 'noOverlap' },
  ],
  removed: [],
  lastChange: '',
};

let service;
beforeAll(() => {
  // jsdom does not implement the native modal methods.
  HTMLDialogElement.prototype.showModal ??= function () { this.open = true; };
  HTMLDialogElement.prototype.close ??= function () {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
});

beforeEach(() => {
  service = {
    getSurvey: jest.fn().mockResolvedValue(survey),
    getStudents: jest.fn().mockResolvedValue(roster),
    getResponses: jest.fn().mockResolvedValue(responses),
    getLatestRound: jest.fn().mockResolvedValue(draft),
    saveRound: jest.fn().mockResolvedValue(),
    publishRound: jest.fn().mockResolvedValue(),
    askForHours: jest.fn().mockResolvedValue(),
  };
});

const renderPage = async () => {
  render(<ReviewGroups user={user} surveyId="s1" service={service} />);
  await screen.findByText(/Review proposed groups/);
};

test('shows the groups, the summary bar, and who needs a group', async () => {
  await renderPage();

  expect(screen.getByText('Round 1', { exact: false })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('4 of 6 students placed');
  expect(screen.getByRole('status')).toHaveTextContent('2 students need a group');
  expect(screen.getByRole('status')).toHaveTextContent('1 of 3 groups reviewed');

  const needs = screen.getByRole('region', { name: 'Needs a group' });
  expect(within(needs).getByText('Tom')).toBeInTheDocument();
  expect(within(needs).getByText(/Didn't fill out the survey/)).toBeInTheDocument();
  expect(within(needs).getByText('Free only on Saturdays. No group shares that time.')).toBeInTheDocument();
});

test('the Move menu shows best fit, the 2-time rule, and a block list conflict', async () => {
  const u = userEvent.setup();
  await renderPage();

  await u.click(screen.getByRole('button', { name: 'Move John' }));
  const menu = screen.getByRole('menu', { name: 'Move John to' });

  expect(within(menu).getByText('Best fit')).toBeInTheDocument();
  expect(within(menu).getByText(/Block list conflict/)).toBeInTheDocument();
  expect(within(menu).getByText(/Jane has John on their block list/)).toBeInTheDocument();
  expect(within(menu).getByRole('menuitem', { name: 'Can’t move' })).toBeDisabled();
});

test('moving a student updates the groups, saves the draft, and can be undone', async () => {
  const u = userEvent.setup();
  await renderPage();

  await u.click(screen.getByRole('button', { name: 'Move John' }));
  await u.click(screen.getByRole('menuitem', { name: 'Move to Group 3' }));

  const group3 = screen.getByRole('region', { name: 'Group 3' });
  expect(within(group3).getByText('John')).toBeInTheDocument();
  expect(screen.getByText(/Last change: Moved John to Group 3/)).toBeInTheDocument();
  await waitFor(() => expect(service.saveRound).toHaveBeenCalled());
  expect(service.saveRound.mock.calls.at(-1)[2].groups[2].memberIds).toEqual(['mary', 'john']);

  await u.click(screen.getByRole('button', { name: 'Undo' }));
  expect(within(screen.getByRole('region', { name: 'Group 2' })).getByText('John')).toBeInTheDocument();
});

test('does not show the Reopen survey button or the Show answers switch', async () => {
  await renderPage();
  expect(screen.queryByRole('button', { name: 'Reopen survey' })).not.toBeInTheDocument();
  expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  expect(screen.queryByText(/Show answers/)).not.toBeInTheDocument();
});

test('Mark reviewed updates the count', async () => {
  const u = userEvent.setup();
  await renderPage();

  const group2 = screen.getByRole('region', { name: 'Group 2' });
  await u.click(within(group2).getByRole('button', { name: 'Mark reviewed' }));
  expect(screen.getByRole('status')).toHaveTextContent('2 of 3 groups reviewed');
});

test('asking for hours sends the request and shows it on the card', async () => {
  const u = userEvent.setup();
  await renderPage();

  await u.click(screen.getByRole('button', { name: 'Place Joan in a group' }));
  await u.click(screen.getByRole('menuitem', { name: /Ask Joan to add hours/ }));

  expect(service.askForHours).toHaveBeenCalledWith('s1', 'joan');
  expect(await screen.findByText(/Asked for hours/)).toBeInTheDocument();
});

test('a round without warnings publishes after confirmation', async () => {
  const u = userEvent.setup();
  await renderPage();

  await u.click(screen.getByRole('button', { name: 'Continue to publish' }));
  const dialog = within(screen.getByRole('dialog', { name: 'Publish groups' }));
  expect(service.publishRound).not.toHaveBeenCalled();
  expect(dialog.queryByRole('checkbox')).not.toBeInTheDocument();
  await u.click(dialog.getByRole('button', { name: 'Publish 3 groups' }));
  await waitFor(() =>
    expect(service.publishRound).toHaveBeenCalledWith('s1', user, expect.objectContaining({ roundNumber: 1 }))
  );
  expect(await screen.findByText(/Groups published/)).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Move John' })).not.toBeInTheDocument();
});

test('each scheduling warning needs its own acknowledgment and closing resets the checklist', async () => {
  const u = userEvent.setup();
  service.getLatestRound.mockResolvedValue({
    ...draft,
    groups: [
      draft.groups[0],
      { ...draft.groups[1], memberIds: ['john', 'mary'] },
      { ...draft.groups[2], memberIds: ['joan', 'tom'] },
    ],
    unplaced: [],
  });
  service.getResponses.mockResolvedValue(responses.map((response) =>
    response.uid === 'john' ? answer('john', [], { ifNeeded: ['Tue-17', 'Thu-17'] }) : response
  ));
  await renderPage();

  const open = screen.getByRole('button', { name: 'Continue to publish' });
  await u.click(open);
  const dialog = within(screen.getByRole('dialog'));
  const [ifNeeded, noSharedTime] = dialog.getAllByRole('checkbox');
  const publish = dialog.getByRole('button', { name: 'Publish 3 groups' });
  expect(ifNeeded).toHaveAccessibleName(/Group 2 relies on .*if needed.* Tue 5 PM, Thu 5 PM/);
  expect(noSharedTime).toHaveAccessibleName(/Group 3 has no fixed shared time/);
  expect(publish).toBeDisabled();
  await u.click(ifNeeded);
  expect(dialog.getByRole('status')).toHaveTextContent('1 of 2 accepted');
  expect(publish).toBeDisabled();
  await u.click(noSharedTime);
  expect(dialog.getByRole('status')).toHaveTextContent('2 of 2 accepted');
  expect(publish).toBeEnabled();
  await u.click(noSharedTime);
  expect(publish).toBeDisabled();
  await u.click(dialog.getByRole('button', { name: 'Back to review' }));

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(service.publishRound).not.toHaveBeenCalled();
  await u.click(open);
  const reopened = within(screen.getByRole('dialog'));
  expect(reopened.getByRole('status')).toHaveTextContent('0 of 2 accepted');
  for (const warning of reopened.getAllByRole('checkbox')) await u.click(warning);
  await u.click(reopened.getByRole('button', { name: 'Publish 3 groups' }));
  expect(await screen.findByText(/Groups published/)).toBeInTheDocument();
  expect(service.publishRound).toHaveBeenCalledTimes(1);
});

test('a saved group with a block list conflict cannot be published', async () => {
  const u = userEvent.setup();
  service.getLatestRound.mockResolvedValue({
    ...draft,
    groups: [{ ...draft.groups[0], memberIds: ['jane', 'john'] }],
  });
  await renderPage();

  await u.click(screen.getByRole('button', { name: 'Continue to publish' }));
  const dialog = within(screen.getByRole('dialog'));
  expect(dialog.getByText('Group 1 has a block list conflict.')).toBeInTheDocument();
  expect(dialog.queryByRole('checkbox')).not.toBeInTheDocument();
  expect(dialog.getByRole('button', { name: 'Publish 1 group' })).toBeDisabled();
  expect(service.publishRound).not.toHaveBeenCalled();
});

test('runs matching from the saved survey answers when there is no draft yet', async () => {
  service.getLatestRound.mockResolvedValue(null);
  await renderPage();

  await waitFor(() => expect(service.saveRound).toHaveBeenCalled());
  const saved = service.saveRound.mock.calls[0][2];
  expect(saved.roundNumber).toBe(1);
  expect(saved.groups.flatMap((g) => g.memberIds)).toEqual(expect.arrayContaining(['mary', 'max']));
  for (const g of saved.groups) {
    expect(g.memberIds.includes('jane') && g.memberIds.includes('john')).toBe(false);
  }
  expect(saved.unplaced).toEqual(expect.arrayContaining([{ uid: 'tom', reason: 'noResponse' }]));
});

test('shows an error when the survey cannot be found', async () => {
  service.getSurvey.mockResolvedValue(null);
  render(<ReviewGroups user={user} surveyId="missing" service={service} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('This survey could not be found.');
});
