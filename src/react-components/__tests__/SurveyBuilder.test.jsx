import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SurveyBuilder from '../structure/SurveyBuilder';
import * as surveyService from '../utils/surveyService';

jest.mock('../utils/surveyService', () => ({
  DEFAULT_QUESTIONS: [
    { id: 'q1', type: 'interests', label: 'Interests & About You', required: true },
  ],
  sendSurvey: jest.fn().mockResolvedValue('new-survey-id'),
  getStudents: jest.fn().mockResolvedValue([
    { uid: 'u1', name: 'Alice', email: 'alice@x.com' },
    { uid: 'u2', name: 'Bob', email: 'bob@x.com' },
  ]),
}), { virtual: true });

describe('SurveyBuilder Component', () => {
  const user = { uid: 'inst-1', email: 'prof@x.com' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders step 1 (Basics) by default with validation for title', async () => {
    const userEventSetup = userEvent.setup();
    render(<SurveyBuilder user={user} />);

    expect(screen.getByRole('heading', { name: '1. Basics' })).toBeInTheDocument();

    // Try proceeding without a title
    await userEventSetup.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Give the survey a title.')).toBeInTheDocument();
  });

  it('allows filling title and progressing to step 2 (Questions)', async () => {
    const userEventSetup = userEvent.setup();
    render(<SurveyBuilder user={user} />);

    await userEventSetup.type(screen.getByLabelText(/Title/i), 'Midterm Feedback');
    await userEventSetup.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByRole('heading', { name: '2. Configure Questions' })).toBeInTheDocument();
    expect(screen.getByText(/Interests & About You/i)).toBeInTheDocument();
  });

  it('allows adding a custom question and progressing through steps', async () => {
    const userEventSetup = userEvent.setup();
    render(<SurveyBuilder user={user} />);

    // Step 1 -> Step 2
    await userEventSetup.type(screen.getByLabelText(/Title/i), 'Quiz Survey');
    await userEventSetup.click(screen.getByRole('button', { name: 'Next' }));

    // Add custom question
    await userEventSetup.type(screen.getByPlaceholderText(/e.g. What is your preferred study format/i), 'Favorite Language');
    await userEventSetup.click(screen.getByRole('button', { name: 'Add Question' }));

    expect(await screen.findByText(/Favorite Language/i)).toBeInTheDocument();

    // Step 2 -> Step 3 (Students)
    await userEventSetup.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('heading', { name: '3. Select Students' })).toBeInTheDocument();

    // Step 3 -> Step 4 (Review)
    await userEventSetup.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('heading', { name: '4. Review' })).toBeInTheDocument();
    expect(screen.getByText('Quiz Survey')).toBeInTheDocument();
  });

  it('calls sendSurvey and triggers onCreated when finishing creation', async () => {
    const onCreated = jest.fn();
    const userEventSetup = userEvent.setup();
    render(<SurveyBuilder user={user} onCreated={onCreated} />);

    // Fast-track through steps to review
    await userEventSetup.type(screen.getByLabelText(/Title/i), 'Quick Survey');
    await userEventSetup.click(screen.getByRole('button', { name: 'Next' })); // to Qs
    await userEventSetup.click(screen.getByRole('button', { name: 'Next' })); // to Students
    await userEventSetup.click(screen.getByRole('button', { name: 'Next' })); // to Review

    // Click Create survey
    await userEventSetup.click(screen.getByRole('button', { name: 'Create survey' }));

    await waitFor(() => {
      expect(surveyService.sendSurvey).toHaveBeenCalledTimes(1);
      expect(onCreated).toHaveBeenCalledWith('new-survey-id');
    });
  });
});
