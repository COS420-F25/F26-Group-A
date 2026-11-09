import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

global.fetch = global.fetch || jest.fn();

// Mock dependencies to avoid ESM firebase import errors during testing
jest.mock('../useUserProfile', () => ({
  useUserProfile: jest.fn(),
}));

import SurveyPage from '../SurveyPage.jsx';
import { useUserProfile } from '../useUserProfile';

jest.mock('../InstructorSurveys', () => () => <div>Instructor Dashboard</div>);
jest.mock('../StudentSurveys', () => () => <div>Student Dashboard</div>);

describe('SurveyPage Component', () => {
  it('renders InstructorSurveys when profile role is instructor', () => {
    useUserProfile.mockReturnValue({
      user: { uid: '1' },
      profile: { role: 'instructor' },
      loading: false,
      error: null,
    });

    render(<SurveyPage />);
    expect(screen.getByText('Instructor Dashboard')).toBeInTheDocument();
  });

  it('renders StudentSurveys when profile role is student', () => {
    useUserProfile.mockReturnValue({
      user: { uid: '2' },
      profile: { role: 'student' },
      loading: false,
      error: null,
    });

    render(<SurveyPage />);
    expect(screen.getByText('Student Dashboard')).toBeInTheDocument();
  });
});
