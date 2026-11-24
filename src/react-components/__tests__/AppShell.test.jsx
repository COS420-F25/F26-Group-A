import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppShell, { ActionBar, Page } from '@utils/AppShell.jsx';
import Breadcrumb from '@utils/Breadcrumb.jsx';
import BlockListStep from '@groups/BlockListStep.jsx';

describe('AppShell', () => {
  it('shows the page inside the main content wrapper', () => {
    const { container } = render(
      <AppShell>
        <p>Page text</p>
      </AppShell>
    );
    expect(screen.getByText('Page text')).toBeInTheDocument();
    expect(container.querySelector('.sv-main-content')).toContainElement(screen.getByText('Page text'));
  });

  it('shows several children in order', () => {
    render(
      <AppShell>
        <p>First</p>
        <p>Second</p>
      </AppShell>
    );
    const [first, second] = screen.getAllByText(/First|Second/);
    expect(first).toHaveTextContent('First');
    expect(second).toHaveTextContent('Second');
  });

  it('renders an empty wrapper when it has no children', () => {
    const { container } = render(<AppShell />);
    expect(container.querySelector('.sv-main-content')).toBeEmptyDOMElement();
  });
});

describe('Page', () => {
  it('shows its content', () => {
    render(
      <Page>
        <p>Body</p>
      </Page>
    );
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('shows the footer after the content', () => {
    render(
      <Page footer={<p>Footer text</p>}>
        <p>Body</p>
      </Page>
    );
    const body = screen.getByText('Body');
    const footer = screen.getByText('Footer text');
    expect(body.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('works without a footer', () => {
    const { container } = render(
      <Page>
        <p>Body</p>
      </Page>
    );
    expect(container.querySelector('.sv-footer')).not.toBeInTheDocument();
  });
});

describe('ActionBar', () => {
  it('shows the note and its buttons', () => {
    render(
      <ActionBar note="A note">
        <button>Go</button>
      </ActionBar>
    );
    expect(screen.getByText('A note')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
  });

  it('leaves out the note paragraph when there is no note', () => {
    const { container } = render(
      <ActionBar>
        <button>Go</button>
      </ActionBar>
    );
    expect(container.querySelector('.sv-footer-note')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
  });

  it('runs the click handler of a button inside it', async () => {
    const onClick = jest.fn();
    render(
      <ActionBar>
        <button onClick={onClick}>Go</button>
      </ActionBar>
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);
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
