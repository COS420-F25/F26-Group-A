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
  const openSurveys = [
    {
      id: 'survey-1',
      title: 'Midterm Feedback',
      description: 'Please fill out',
      tags: ['Math', 'Writing'],
      startHour: 9,
      endHour: 12,
    },
  ];
  let unsubscribeMock;

  // Opens the survey and returns a userEvent instance
  async function openFirstSurvey() {
    const user = userEvent.setup();
    render(<StudentSurveys user={mockUser} profile={mockProfile} />);
    await user.click(await screen.findByRole('button', { name: 'Open survey' }));
    await screen.findByText('When can you meet for about an hour each week?');
    return user;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    unsubscribeMock = jest.fn();
    watchOpenSurveys.mockImplementation((onData) => {
      onData([]);
      return unsubscribeMock;
    });
    getMyResponse.mockResolvedValue(null);
    saveResponse.mockResolvedValue();
  });

  describe('survey list', () => {
    it('renders empty state when no open surveys exist', async () => {
      render(<StudentSurveys user={mockUser} profile={mockProfile} />);
      expect(await screen.findByText(/No surveys are open right now/i)).toBeInTheDocument();
    });

    it('renders open surveys and opens the first step of the form', async () => {
      watchOpenSurveys.mockImplementation((onData) => {
        onData(openSurveys);
        return unsubscribeMock;
      });

      render(<StudentSurveys user={mockUser} profile={mockProfile} />);
      expect(await screen.findByText('Midterm Feedback')).toBeInTheDocument();

      await userEvent.setup().click(screen.getByRole('button', { name: 'Open survey' }));
      expect(await screen.findByText('When can you meet for about an hour each week?')).toBeInTheDocument();
      expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
    });

    it('stops listening when it unmounts', () => {
      const { unmount } = render(<StudentSurveys user={mockUser} profile={mockProfile} />);
      unmount();
      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });

  describe('steps', () => {
    beforeEach(() => {
      watchOpenSurveys.mockImplementation((onData) => {
        onData(openSurveys);
        return unsubscribeMock;
      });
    });

    it('will not leave the first step with no hours selected', async () => {
      const user = await openFirstSurvey();
      await user.click(screen.getByRole('button', { name: 'Continue' }));

      expect(screen.getByRole('alert')).toHaveTextContent('Mark at least one hour when you are free.');
      expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
    });

    it('will not leave the interests step with nothing picked', async () => {
      const user = await openFirstSurvey();
      await user.click(screen.getByRole('button', { name: /Mon 9 AM/ }));
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      expect(screen.getByText('Question 2 of 3')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Continue' }));
      expect(screen.getByRole('alert')).toHaveTextContent('Pick at least one interest.');
      expect(screen.getByText('Question 2 of 3')).toBeInTheDocument();
    });

    it('goes back a step and keeps the answers', async () => {
      const user = await openFirstSurvey();
      await user.click(screen.getByRole('button', { name: /Mon 9 AM/ }));
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await user.click(screen.getByRole('button', { name: 'Back' }));

      expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Mon 9 AM/ })).toHaveAttribute('aria-pressed', 'true');
    });

    it('the block list step is in the survey and is blank', async () => {
      const user = await openFirstSurvey();
      await user.click(screen.getByRole('button', { name: /Mon 9 AM/ }));
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await user.click(screen.getByRole('button', { name: 'Math' }));
      await user.click(screen.getByRole('button', { name: 'Continue' }));

      expect(screen.getByText('Question 3 of 3')).toBeInTheDocument();
      expect(screen.getByTestId('block-list-step')).toBeEmptyDOMElement();
      // The last question step leads to the review step
      expect(screen.getByRole('button', { name: 'Review answers' })).toBeInTheDocument();
    });

    it('the Erase mode clears a cell, and the Available mode marks it', async () => {
      const user = await openFirstSurvey();
      const cell = screen.getByRole('button', { name: /Tue 10 AM/ });

      await user.click(cell);
      expect(cell).toHaveAttribute('aria-pressed', 'true');

      await user.click(screen.getByRole('button', { name: 'Erase' }));
      expect(screen.getByRole('button', { name: 'Erase' })).toHaveAttribute('aria-pressed', 'true');
      await user.click(cell);
      expect(cell).toHaveAttribute('aria-pressed', 'false');
    });

    it('Clear all removes every hour', async () => {
      const user = await openFirstSurvey();
      await user.click(screen.getByRole('button', { name: /Mon 9 AM/ }));
      await user.click(screen.getByRole('button', { name: 'Clear all' }));
      expect(screen.getByRole('button', { name: /Mon 9 AM/ })).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('review and submit', () => {
    beforeEach(() => {
      watchOpenSurveys.mockImplementation((onData) => {
        onData(openSurveys);
        return unsubscribeMock;
      });
    });

    // Fills every step and stops on the review step
    async function fillToReview() {
      const user = await openFirstSurvey();
      await user.click(screen.getByRole('button', { name: /Mon 9 AM/ }));
      await user.click(screen.getByRole('button', { name: /Mon 10 AM/ }));
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await user.click(screen.getByRole('button', { name: 'Writing' }));
      await user.click(screen.getByRole('button', { name: 'Math' }));
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await user.click(screen.getByRole('button', { name: 'Review answers' }));
      await screen.findByText('Review your answers');
      return user;
    }

    it('summarizes the answers', async () => {
      await fillToReview();
      expect(screen.getByText('9 AM to 11 AM')).toBeInTheDocument();
      expect(screen.getByText('Math, Writing')).toBeInTheDocument();
    });

    it('saves hours and only the survey\'s interests, in the survey\'s order', async () => {
      const user = await fillToReview();
      await user.click(screen.getByRole('button', { name: 'Submit survey' }));

      await waitFor(() => expect(saveResponse).toHaveBeenCalledTimes(1));
      const [surveyId, savedUser, savedProfile, answers] = saveResponse.mock.calls[0];
      expect(surveyId).toBe('survey-1');
      expect(savedUser).toBe(mockUser);
      expect(savedProfile).toBe(mockProfile);
      expect(answers.availability.sort()).toEqual(['Mon-09', 'Mon-10']);
      expect(answers.tags).toEqual(['Math', 'Writing']);
      // The empty block list step adds nothing to the saved answers
      expect(Object.keys(answers).sort()).toEqual(['availability', 'tags']);
    });

    it('shows a saved message and lets the student go back to the list', async () => {
      const user = await fillToReview();
      await user.click(screen.getByRole('button', { name: 'Submit survey' }));

      expect(await screen.findByText(/Your answers are saved/)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Back to surveys' }));
      expect(await screen.findByText('Midterm Feedback')).toBeInTheDocument();
    });

    it('shows the closed message when the survey was closed (permission denied)', async () => {
      saveResponse.mockRejectedValue(Object.assign(new Error('nope'), { code: 'permission-denied' }));
      const user = await fillToReview();
      await user.click(screen.getByRole('button', { name: 'Submit survey' }));

      expect(await screen.findByText(/This survey is closed/)).toBeInTheDocument();
      expect(screen.queryByText(/Your answers are saved/)).not.toBeInTheDocument();
    });

    it('shows other save errors', async () => {
      saveResponse.mockRejectedValue(new Error('network down'));
      const user = await fillToReview();
      await user.click(screen.getByRole('button', { name: 'Submit survey' }));
      expect(await screen.findByText(/network down/)).toBeInTheDocument();
    });

    it('the Edit links jump back to that step', async () => {
      const user = await fillToReview();
      await user.click(screen.getByRole('button', { name: /Edit interests/ }));
      expect(screen.getByText('Question 2 of 3')).toBeInTheDocument();
    });

    it('fills in earlier answers and offers Save changes', async () => {
      getMyResponse.mockResolvedValue({ availability: ['Mon-09'], tags: ['Math'] });
      const user = userEvent.setup();
      render(<StudentSurveys user={mockUser} profile={mockProfile} />);
      await user.click(await screen.findByRole('button', { name: 'Open survey' }));

      expect(await screen.findByText(/You already answered this survey/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Mon 9 AM/ })).toHaveAttribute('aria-pressed', 'true');

      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await user.click(screen.getByRole('button', { name: 'Review answers' }));
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
    });

    it('keeps the form open if the survey is closed while the student is filling it in', async () => {
      let push;
      watchOpenSurveys.mockImplementation((onData) => {
        push = onData;
        onData(openSurveys);
        return unsubscribeMock;
      });
      const user = await openFirstSurvey();
      await user.click(screen.getByRole('button', { name: /Mon 9 AM/ }));

      const { act } = require('@testing-library/react');
      act(() => push([]));

      expect(screen.getByRole('button', { name: /Mon 9 AM/ })).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
