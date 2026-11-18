import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import AvailabilityGrid from '../content/AvailabilityGrid.jsx';

describe('AvailabilityGrid Component', () => {
  const defaultProps = {
    startHour: 9,
    endHour: 12,
    value: new Set(),
    ifNeededValue: new Set(),
    onChange: jest.fn(),
    disabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders days of the week and hours correctly', () => {
    render(<AvailabilityGrid {...defaultProps} />);

    expect(screen.getByRole('group', { name: /Weekly availability chart/i })).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('9 AM')).toBeInTheDocument();
    expect(screen.getByText('11 AM')).toBeInTheDocument();
  });

  it('toggles time slot selection via click', () => {
    const onChange = jest.fn();
    render(<AvailabilityGrid {...defaultProps} onChange={onChange} mode="paint" />);

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

  describe('mode', () => {
    it('paint mode marks a cell and returns updated set', () => {
      const onChange = jest.fn();
      render(<AvailabilityGrid {...defaultProps} value={new Set(['Mon-09'])} mode="paint" onChange={onChange} />);

      fireEvent.click(screen.getByRole('button', { name: /Tue 9 AM/i }), { detail: 0 });
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].has('Tue-09')).toBe(true);
    });

    it('erase mode clears a marked cell', () => {
      const onChange = jest.fn();
      render(<AvailabilityGrid {...defaultProps} value={new Set(['Mon-09'])} mode="erase" onChange={onChange} />);

      fireEvent.click(screen.getByRole('button', { name: /Mon 9 AM/i }), { detail: 0 });
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].has('Mon-09')).toBe(false);
    });

    it('does not change the Set it was given', () => {
      const value = new Set(['Mon-09']);
      render(<AvailabilityGrid {...defaultProps} value={value} mode="paint" />);
      fireEvent.click(screen.getByRole('button', { name: /Tue 9 AM/i }), { detail: 0 });
      expect([...value]).toEqual(['Mon-09']);
    });

    it('a mouse click (detail 1) is left to pointer events', () => {
      const onChange = jest.fn();
      render(<AvailabilityGrid {...defaultProps} onChange={onChange} />);
      fireEvent.click(screen.getByRole('button', { name: /Mon 9 AM/i }), { detail: 1 });
      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
