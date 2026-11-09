import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import AvailabilityGrid from '../AvailabilityGrid.jsx';

describe('AvailabilityGrid Component', () => {
  const defaultProps = {
    startHour: 9,
    endHour: 12,
    value: new Set(),
    onChange: jest.fn(),
    disabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders days of the week and hours correctly', () => {
    render(<AvailabilityGrid {...defaultProps} />);

    expect(screen.getByRole('group', { name: /Weekly availability/i })).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('9 AM')).toBeInTheDocument();
    expect(screen.getByText('11 AM')).toBeInTheDocument();
  });

  it('toggles time slot selection via click', () => {
    const onChange = jest.fn();
    render(<AvailabilityGrid {...defaultProps} onChange={onChange} />);

    const slotButton = screen.getByRole('button', { name: /Mon 9 AM/i });
    fireEvent.click(slotButton, { detail: 0 });

    expect(onChange).toHaveBeenCalledTimes(1);
    const newSet = onChange.mock.calls[0][0];
    expect(newSet.has('Mon-09')).toBe(true);
  });

  it('does not allow interaction when disabled prop is true', () => {
    const onChange = jest.fn();
    render(<AvailabilityGrid {...defaultProps} disabled={true} onChange={onChange} />);

    const slotButton = screen.getByRole('button', { name: /Mon 9 AM/i });
    fireEvent.click(slotButton, { detail: 0 });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('reflects initial values correctly with aria-pressed', () => {
    const initialValue = new Set(['Mon-09', 'Tue-10']);
    render(<AvailabilityGrid {...defaultProps} value={initialValue} />);

    expect(screen.getByRole('button', { name: /Mon 9 AM/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Tue 10 AM/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Wed 9 AM/i })).toHaveAttribute('aria-pressed', 'false');
  });
});
