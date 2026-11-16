import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppShell, { ActionBar, Page } from '../AppShell.jsx';
import Breadcrumb from '../Breadcrumb.jsx';
import BlockListStep from '../BlockListStep.jsx';

describe('AppShell', () => {
  const user = { email: 'ana@x.com' };
  const profile = { displayName: 'Ana Lopez', role: 'student' };

  it('shows the heading, the page, and the name, initials and role of the user', () => {
    render(
      <AppShell heading="Study groups" nav={[]} user={user} profile={profile}>
        <p>Page text</p>
      </AppShell>
    );
    expect(screen.getByText('Study groups')).toBeInTheDocument();
    expect(screen.getByText('Page text')).toBeInTheDocument();
    expect(screen.getByText('Ana Lopez')).toBeInTheDocument();
    expect(screen.getByText('AL')).toBeInTheDocument();
    expect(screen.getByText('Student')).toBeInTheDocument();
  });

  it('falls back to the email when there is no name, and to ? when there is nothing', () => {
    const { rerender } = render(<AppShell heading="h" nav={[]} user={user} profile={{ role: 'instructor' }} />);
    expect(screen.getByText('ana@x.com')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    rerender(<AppShell heading="h" nav={[]} />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('marks the active item and runs onSelect for button items', async () => {
    const onSelect = jest.fn();
    render(
      <AppShell
        heading="h"
        nav={[
          { id: 'a', label: 'First', onSelect },
          { id: 'b', label: 'Second', href: '#second' },
        ]}
        activeId="b"
      />
    );
    expect(screen.getByRole('link', { name: 'Second' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'First' })).not.toHaveAttribute('aria-current');
    await userEvent.setup().click(screen.getByRole('button', { name: 'First' }));
    expect(onSelect).toHaveBeenCalled();
  });

  it('opens and closes a sub menu', async () => {
    render(
      <AppShell
        heading="h"
        nav={[{ id: 'g', label: 'Group', children: [{ id: 'c', label: 'Child', href: '#c' }] }]}
        activeId="c"
      />
    );
    const toggle = screen.getByRole('button', { name: 'Group' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Child' })).toHaveAttribute('aria-current', 'page');
    await userEvent.setup().click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'Child' })).not.toBeInTheDocument();
  });

  it('Page and ActionBar show their content and the note', () => {
    render(
      <Page footer={<ActionBar note="A note"><button>Go</button></ActionBar>}>
        <p>Body</p>
      </Page>
    );
    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.getByText('A note')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
  });
});

describe('Breadcrumb', () => {
  it('marks the current step', () => {
    render(<Breadcrumb steps={['One', 'Two', 'Three']} current={1} />);
    expect(screen.getByText('Two')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('One')).not.toHaveAttribute('aria-current');
  });

  it('makes earlier steps buttons only when onSelect is given', async () => {
    const onSelect = jest.fn();
    const { rerender } = render(<Breadcrumb steps={['One', 'Two', 'Three']} current={2} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    rerender(<Breadcrumb steps={['One', 'Two', 'Three']} current={2} onSelect={onSelect} />);
    expect(screen.getAllByRole('button')).toHaveLength(2); // One and Two, not Three
    await userEvent.setup().click(screen.getByRole('button', { name: 'One' }));
    expect(onSelect).toHaveBeenCalledWith(0);
  });
});

describe('BlockListStep (placeholder)', () => {
  it('is empty: no text, no inputs, no buttons', () => {
    const { container } = render(<BlockListStep />);
    expect(screen.getByTestId('block-list-step')).toBeEmptyDOMElement();
    expect(container).toHaveTextContent('');
    expect(within(container).queryByRole('button')).not.toBeInTheDocument();
    expect(within(container).queryByRole('textbox')).not.toBeInTheDocument();
  });
});
