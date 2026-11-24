import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GroupsDemoPage from '../structure/GroupsDemoPage.jsx';

test('shows the sample groups and the Needs a group list without Firebase', async () => {
  render(<GroupsDemoPage />);
  expect(await screen.findByText(/Review proposed groups/)).toBeInTheDocument();
  expect(screen.getByRole('note')).toHaveTextContent('Demo mode');
  expect(screen.getByRole('status')).toHaveTextContent('16 of 19 students placed');

  const needs = screen.getByRole('region', { name: 'Needs a group' });
  expect(within(needs).getByText('Jack Doe')).toBeInTheDocument();
  expect(within(needs).getByText(/Added 2 “if needed” hours/)).toBeInTheDocument();
  expect(within(needs).getByRole('button', { name: 'Place in Group 3' })).toBeInTheDocument();
});

test('the Move menu for John Public matches the mockup', async () => {
  const u = userEvent.setup();
  render(<GroupsDemoPage />);
  await u.click(await screen.findByRole('button', { name: 'Move John Public' }));

  const menu = screen.getByRole('menu', { name: 'Move John Public to' });
  expect(within(menu).getByText('Best fit')).toBeInTheDocument();
  expect(within(menu).getByText(/below the 2-time rule/)).toBeInTheDocument();
  expect(within(menu).getByText(/Jane Doe has John Public on their block list/)).toBeInTheDocument();
});

test('moving a student and undoing it works in the demo', async () => {
  const u = userEvent.setup();
  render(<GroupsDemoPage />);
  await u.click(await screen.findByRole('button', { name: 'Move John Public' }));
  await u.click(screen.getByRole('menuitem', { name: 'Move to Group 3' }));
  expect(within(screen.getByRole('region', { name: 'Group 3' })).getByText('John Public')).toBeInTheDocument();

  await u.click(screen.getByRole('button', { name: 'Undo' }));
  expect(within(screen.getByRole('region', { name: 'Group 2' })).getByText('John Public')).toBeInTheDocument();
});
