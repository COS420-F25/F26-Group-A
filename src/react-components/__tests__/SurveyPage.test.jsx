import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SurveyPage from '@/pagedeps/SurveyPage';
import { useUserProfile } from '@authent/useUserProfile';

jest.mock('@authent/useUserProfile', () => ({
  useUserProfile: jest.fn(),
}));

jest.mock('@survey/InstructorSurveys', () => () => <div>Instructor Dashboard</div>);
jest.mock('@survey/StudentSurveys', () => () => <div>Student Dashboard</div>);

describe('SurveyPage Component', () => {
  const mockUser = { uid: 'user-123', email: 'test@example.com' };

  it('renders loading state when profile is loading', () => {
    useUserProfile.mockReturnValue({ user: mockUser, profile: null, loading: true });
    render(<SurveyPage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders instructor dashboard when user profile has instructor role', () => {
    useUserProfile.mockReturnValue({
      user: mockUser,
      profile: { role: 'instructor', displayName: 'Prof Smith' },
      loading: false,
    });
    render(<SurveyPage />);
    expect(screen.getByText('Instructor Dashboard')).toBeInTheDocument();
  });

  it('renders student dashboard when user profile has student role', () => {
    useUserProfile.mockReturnValue({
      user: mockUser,
      profile: { role: 'student', displayName: 'Student Sam' },
      loading: false,
    });
    render(<SurveyPage />);
    expect(screen.getByText('Student Dashboard')).toBeInTheDocument();
  });

  it('asks the user to choose a role when no profile is saved yet', () => {
    // useUserProfile gives profile: null until a role is saved
    useUserProfile.mockReturnValue({
      user: mockUser,
      profile: null,
      loading: false,
    });
    render(<SurveyPage />);
    expect(screen.getByText(/finish setting up/i)).toBeInTheDocument();
    expect(screen.queryByText('Instructor Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Student Dashboard')).not.toBeInTheDocument();
  });
});
