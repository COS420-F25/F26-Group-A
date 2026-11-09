import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StudentSurveys from '../StudentSurveys.jsx';
import { watchOpenSurveys, getMyResponse, saveResponse } from '../surveyService';

jest.mock('../surveyService', () => ({
  watchOpenSurveys: jest.fn(),
  getMyResponse: jest.fn(),
  saveResponse: jest.fn(),
}));

describe('StudentSurveys Component', () => {
  const mockUser = { uid: 'student-1', email: 's@student.com' };
  const mockProfile = { role: 'student', displayName: 'Student Sam' };
  let unsubscribeMock;

  beforeEach(() => {
    jest.clearAllMocks();
    unsubscribeMock = jest.fn();
    watchOpenSurveys.mockImplementation((onData) => {
      onData([]);
      return unsubscribeMock;
    });
  });

  it('renders empty state when no open surveys exist', async () => {
    render(<StudentSurveys user={mockUser} profile={mockProfile} />);
    expect(await screen.findByText(/No surveys are open right now/i)).toBeInTheDocument();
  });

  it('renders assigned open surveys and allows opening a survey form', async () => {
    const openSurveys = [
      { id: 'survey-1', title: 'Midterm Feedback', description: 'Please fill out', tags: ['Math'], startHour: 9, endHour: 12 },
    ];
    watchOpenSurveys.mockImplementation((onData) => {
      onData(openSurveys);
      return unsubscribeMock;
    });
    getMyResponse.mockResolvedValue(null);

    const user = userEvent.setup();
    render(<StudentSurveys user={mockUser} profile={mockProfile} />);

    expect(await screen.findByText('Midterm Feedback')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open survey' }));
    expect(await screen.findByText('When are you free?')).toBeInTheDocument();
  });
});
