import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SurveyFlow from '../structure/SurveyFlow';
import * as surveyService from '../utils/surveyService';

jest.mock('../utils/surveyService', () => ({
  getMyResponse: jest.fn().mockResolvedValue(null),
  saveResponse: jest.fn().mockResolvedValue(),
}), { virtual: true });

describe('SurveyFlow Component', () => {
  const mockSurvey = {
    id: 's-123',
    title: 'Study Groups Survey',
    description: 'Please provide availability.',
    startHour: 9,
    endHour: 12,
    questions: [
      { id: 'q1', type: 'interests', label: 'Interests & About You' },
      { id: 'q2', type: 'availability', label: 'Availability' },
      { id: 'q3', type: 'blocklist', label: 'Block list' },
    ],
  };
  const mockUser = { uid: 'u-student', email: 'student@example.com' };
  const mockProfile = { displayName: 'Jane Student', role: 'student' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders survey title and first step correctly', async () => {
    render(<SurveyFlow survey={mockSurvey} user={mockUser} profile={mockProfile} />);

    expect(screen.getByRole('heading', { name: 'Study Groups Survey' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'About You & Preferences' })).toBeInTheDocument();
    expect(screen.getByText('Interests & About You')).toBeInTheDocument();
  });

  it('navigates through steps from General -> Availability -> Blocklist -> Review', async () => {
    const userEventSetup = userEvent.setup();
    render(<SurveyFlow survey={mockSurvey} user={mockUser} profile={mockProfile} />);

    // Step 1: General
    expect(await screen.findByRole('heading', { name: 'About You & Preferences' })).toBeInTheDocument();
    await userEventSetup.click(screen.getByRole('button', { name: 'Continue' }));

    // Step 2: Availability
    expect(await screen.findByRole('heading', { name: 'Availability' })).toBeInTheDocument();
    await userEventSetup.click(screen.getByRole('button', { name: 'Continue' }));

    // Step 3: Blocklist
    expect(await screen.findByTestId('block-list-step')).toBeInTheDocument();
    await userEventSetup.click(screen.getByRole('button', { name: 'Review answers' }));

    // Review Step
    expect(await screen.findByRole('heading', { name: 'Review your answers' })).toBeInTheDocument();
  });

  it('saves response successfully upon submission', async () => {
    const userEventSetup = userEvent.setup();
    render(<SurveyFlow survey={mockSurvey} user={mockUser} profile={mockProfile} />);

    // Fast-track to review
    await screen.findByRole('heading', { name: 'About You & Preferences' });
    await userEventSetup.click(screen.getByRole('button', { name: 'Continue' })); // to availability
    await userEventSetup.click(screen.getByRole('button', { name: 'Continue' })); // to blocklist
    await userEventSetup.click(screen.getByRole('button', { name: 'Review answers' })); // to review

    // Click submit
    await userEventSetup.click(screen.getByRole('button', { name: 'Submit survey' }));

    await waitFor(() => {
      expect(surveyService.saveResponse).toHaveBeenCalledTimes(1);
      expect(surveyService.saveResponse).toHaveBeenCalledWith(
        's-123',
        mockUser,
        mockProfile,
        expect.any(Object)
      );
      expect(screen.getByText(/Your answers are saved/i)).toBeInTheDocument();
    });
  });
});
