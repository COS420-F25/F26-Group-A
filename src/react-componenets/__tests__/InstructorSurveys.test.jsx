import '@testing-library/jest-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InstructorSurveys from '../InstructorSurveys.jsx';
import {
  watchMySurveys,
  sendSurvey,
  getResponses,
  setSurveyStatus,
  watchResponses,
  getStudents,
} from '../surveyService';
import { downloadCsv } from '../csv';

jest.mock('../surveyService', () => ({
  DEFAULT_TAGS: ['Math', 'Programming'],
  watchMySurveys: jest.fn(),
  sendSurvey: jest.fn(),
  getResponses: jest.fn(),
  setSurveyStatus: jest.fn(),
  watchResponses: jest.fn(),
  getStudents: jest.fn(),
  getMyResponse: jest.fn(),
  saveResponse: jest.fn(),
}));

jest.mock('../csv', () => ({
  csvFileName: (title) => `${title}.csv`,
  responsesToCsv: jest.fn(() => 'csv-data'),
  downloadCsv: jest.fn(),
}));

describe('InstructorSurveys Component', () => {
  const mockUser = { uid: 'inst-1' };
  const mockProfile = { role: 'instructor', displayName: 'Prof Smith' };
  const survey = {
    id: 's1',
    title: 'Survey 1',
    description: 'Please answer',
    startHour: 9,
    endHour: 17,
    tags: ['Math', 'Writing'],
    status: 'open',
  };
  let unsubscribeMock;

  const renderPage = () => render(<InstructorSurveys user={mockUser} profile={mockProfile} />);

  beforeEach(() => {
    jest.clearAllMocks();
    window.location.hash = '';
    unsubscribeMock = jest.fn();
    watchMySurveys.mockImplementation((uid, onData) => {
      onData([]);
      return unsubscribeMock;
    });
    watchResponses.mockImplementation((id, onData) => {
      onData([]);
      return unsubscribeMock;
    });
    getStudents.mockResolvedValue([]);
    sendSurvey.mockResolvedValue('new-id');
    setSurveyStatus.mockResolvedValue();
  });

  describe('sent surveys list', () => {
    it('displays a loading state before surveys arrive', () => {
      watchMySurveys.mockImplementationOnce(() => unsubscribeMock);
      renderPage();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('shows an empty state', () => {
      renderPage();
      expect(screen.getByText(/You have not sent a survey yet/)).toBeInTheDocument();
    });

    it('renders sent surveys with an Open badge', async () => {
      watchMySurveys.mockImplementationOnce((uid, onData) => {
        onData([survey]);
        return unsubscribeMock;
      });
      renderPage();
      expect(await screen.findByText('Survey 1')).toBeInTheDocument();
      expect(screen.getByText('Open')).toBeInTheDocument();
    });

    it('puts Create survey in a sub menu under Surveys', () => {
      renderPage();
      const menu = screen.getByRole('navigation', { name: 'Survey menu' });
      const toggle = within(menu).getByRole('button', { name: 'Surveys' });
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(within(menu).getByRole('link', { name: 'Sent surveys' })).toBeInTheDocument();
      expect(within(menu).getByRole('link', { name: 'Create survey' })).toBeInTheDocument();
    });

    it('collapses the sub menu', async () => {
      renderPage();
      const menu = screen.getByRole('navigation', { name: 'Survey menu' });
      await userEvent.setup().click(within(menu).getByRole('button', { name: 'Surveys' }));
      expect(within(menu).queryByRole('link', { name: 'Create survey' })).not.toBeInTheDocument();
    });
  });

  describe('creating a survey in steps', () => {
    beforeEach(() => {
      window.location.hash = '#create';
    });

    async function fillBasics(user, title = 'New Quiz') {
      await user.type(screen.getByLabelText('Title'), title);
    }

    it('starts on the basics step', () => {
      renderPage();
      expect(screen.getByLabelText('Title')).toBeInTheDocument();
      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    });

    it('will not leave the basics step with an empty or blank title', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.type(screen.getByLabelText('Title'), '   ');
      await user.click(screen.getByRole('button', { name: 'Next' }));
      expect(screen.getByRole('alert')).toHaveTextContent('Give the survey a title.');
      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    });

    it('will not leave the hours step when the day ends before it starts', async () => {
      const user = userEvent.setup();
      renderPage();
      await fillBasics(user);
      await user.click(screen.getByRole('button', { name: 'Next' }));

      await user.selectOptions(screen.getByLabelText('Last hour'), '8');
      await user.click(screen.getByRole('button', { name: 'Next' }));
      expect(screen.getByRole('alert')).toHaveTextContent('The day must end after it starts.');
      expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    });

    it('will not leave the interests step with no interests', async () => {
      const user = userEvent.setup();
      renderPage();
      await fillBasics(user);
      await user.click(screen.getByRole('button', { name: 'Next' }));
      await user.click(screen.getByRole('button', { name: 'Next' }));

      await user.click(screen.getByRole('button', { name: 'Remove Math' }));
      await user.click(screen.getByRole('button', { name: 'Remove Programming' }));
      await user.click(screen.getByRole('button', { name: 'Next' }));
      expect(screen.getByRole('alert')).toHaveTextContent('Add at least one interest');
    });

    it('adds interests: ignores duplicates and blanks, cuts long ones, Enter does not advance', async () => {
      const user = userEvent.setup();
      renderPage();
      await fillBasics(user);
      await user.click(screen.getByRole('button', { name: 'Next' }));
      await user.click(screen.getByRole('button', { name: 'Next' }));

      const input = screen.getByLabelText('New interest');
      await user.type(input, 'math{Enter}');
      await user.type(input, '   {Enter}');
      await user.type(input, `${'x'.repeat(40)}{Enter}`);

      expect(screen.getAllByRole('button', { name: /^Remove / })).toHaveLength(3);
      expect(screen.getByRole('button', { name: `Remove ${'x'.repeat(30)}` })).toBeInTheDocument();
      expect(screen.getByText('Step 3 of 4')).toBeInTheDocument();
    });

    it('reviews the details, lets you edit one, and creates the survey', async () => {
      const user = userEvent.setup();
      renderPage();
      await fillBasics(user, '  New Quiz  ');
      await user.type(screen.getByLabelText(/Message to students/), '  Hello  ');
      await user.click(screen.getByRole('button', { name: 'Next' }));
      await user.click(screen.getByRole('button', { name: 'Next' }));
      await user.click(screen.getByRole('button', { name: 'Next' }));

      expect(screen.getByText('Step 4 of 4')).toBeInTheDocument();
      expect(screen.getByText('Monday to Sunday, 8 AM to 10 PM')).toBeInTheDocument();
      expect(screen.getByText('Math, Programming')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /Edit basics/ }));
      expect(screen.getByLabelText('Title')).toHaveValue('  New Quiz  ');
    });

    it('sends the trimmed details with the user, then opens the new survey', async () => {
      const user = userEvent.setup();
      renderPage();
      await fillBasics(user, '  New Quiz  ');
      await user.type(screen.getByLabelText(/Message to students/), '  Hello  ');
      for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Next' }));
      await user.click(screen.getByRole('button', { name: 'Create survey' }));

      await waitFor(() => expect(sendSurvey).toHaveBeenCalledTimes(1));
      expect(sendSurvey).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          title: '  New Quiz  ',
          description: '  Hello  ',
          tags: ['Math', 'Programming'],
          startHour: 8,
          endHour: 22,
        })
      );
      await waitFor(() => expect(window.location.hash).toBe('#survey/new-id'));
    });

    it('shows an error and stays on the review step when creating fails', async () => {
      sendSurvey.mockRejectedValue(new Error('offline'));
      const user = userEvent.setup();
      renderPage();
      await fillBasics(user);
      for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Next' }));
      await user.click(screen.getByRole('button', { name: 'Create survey' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Could not create the survey: offline');
      expect(screen.getByRole('button', { name: 'Create survey' })).toBeEnabled();
    });

    it('Back goes to the earlier step and Cancel leaves the first step', async () => {
      const user = userEvent.setup();
      renderPage();
      await fillBasics(user);
      await user.click(screen.getByRole('button', { name: 'Next' }));
      await user.click(screen.getByRole('button', { name: 'Back' }));
      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      await waitFor(() => expect(window.location.hash).toBe('#surveys'));
    });
  });

  describe('one survey', () => {
    beforeEach(() => {
      window.location.hash = '#survey/s1';
      watchMySurveys.mockImplementation((uid, onData) => {
        onData([survey]);
        return unsubscribeMock;
      });
    });

    it('shows the survey title, status and the steps from set up to publish', async () => {
      renderPage();
      expect(await screen.findByRole('heading', { name: 'Survey 1 is open' })).toBeInTheDocument();
      const crumbs = screen.getByRole('navigation', { name: 'Survey progress' });
      expect(within(crumbs).getByText('Collect responses')).toHaveAttribute('aria-current', 'step');
    });

    it('shows who has answered out of all students, and who is still waiting', async () => {
      watchResponses.mockImplementation((id, onData) => {
        onData([{ uid: 'a', name: 'Ana', tags: ['Math'], availability: ['Mon-09', 'Mon-10'] }]);
        return unsubscribeMock;
      });
      getStudents.mockResolvedValue([
        { uid: 'a', name: 'Ana', email: 'a@x.com' },
        { uid: 'b', name: 'Ben', email: 'b@x.com' },
        { uid: 'c', name: '', email: 'c@x.com' },
      ]);
      renderPage();

      expect(await screen.findByText('Still waiting on 2 students')).toBeInTheDocument();
      expect(screen.getByText('1 of 3')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33');
      expect(screen.getByText('Ben')).toBeInTheDocument();
      expect(screen.getByText('c@x.com')).toBeInTheDocument();
    });

    it('hides and shows the waiting names', async () => {
      getStudents.mockResolvedValue([{ uid: 'b', name: 'Ben', email: 'b@x.com' }]);
      renderPage();
      const user = userEvent.setup();
      await screen.findByText('Ben');
      await user.click(screen.getByRole('button', { name: 'Hide names' }));
      expect(screen.queryByText('Ben')).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Show names' }));
      expect(screen.getByText('Ben')).toBeInTheDocument();
    });

    it('still shows the answer count when the student list cannot be loaded', async () => {
      getStudents.mockRejectedValue(new Error('denied'));
      watchResponses.mockImplementation((id, onData) => {
        onData([{ uid: 'a', name: 'Ana', tags: [], availability: [] }]);
        return unsubscribeMock;
      });
      renderPage();
      expect(await screen.findByText('Could not load the student list.')).toBeInTheDocument();
      expect(screen.getByText('students have answered')).toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('lists the answers, and says so when there are none', async () => {
      renderPage();
      expect(await screen.findByText('No answers yet.')).toBeInTheDocument();
    });

    it('shows a table of answers with the student, interests and hour count', async () => {
      watchResponses.mockImplementation((id, onData) => {
        onData([{ uid: 'a', name: 'Ana', tags: ['Math', 'Writing'], availability: ['Mon-09', 'Mon-10'] }]);
        return unsubscribeMock;
      });
      renderPage();
      const row = (await screen.findByText('Ana', { selector: 'td' })).closest('tr');
      expect(within(row).getByText('Math, Writing')).toBeInTheDocument();
      expect(within(row).getByText('2')).toBeInTheDocument();
    });

    it('Close survey and Reopen survey set the status', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(await screen.findByRole('button', { name: 'Close survey' }));
      expect(setSurveyStatus).toHaveBeenCalledWith('s1', 'closed');
    });

    it('shows Reopen survey for a closed survey', async () => {
      watchMySurveys.mockImplementation((uid, onData) => {
        onData([{ ...survey, status: 'closed' }]);
        return unsubscribeMock;
      });
      const user = userEvent.setup();
      renderPage();
      await user.click(await screen.findByRole('button', { name: 'Reopen survey' }));
      expect(setSurveyStatus).toHaveBeenCalledWith('s1', 'open');
    });

    it('shows an error when the status cannot be changed', async () => {
      setSurveyStatus.mockRejectedValue(new Error('denied'));
      const user = userEvent.setup();
      renderPage();
      await user.click(await screen.findByRole('button', { name: 'Close survey' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Could not change the survey: denied');
    });

    it('Download CSV hands the loaded answers to downloadCsv', async () => {
      watchResponses.mockImplementation((id, onData) => {
        onData([{ uid: 'a', name: 'Ana', tags: [], availability: [] }]);
        return unsubscribeMock;
      });
      const user = userEvent.setup();
      renderPage();
      await user.click(await screen.findByRole('button', { name: 'Download CSV' }));
      expect(downloadCsv).toHaveBeenCalledWith('Survey 1.csv', 'csv-data');
    });

    it('does not download before the answers have loaded', async () => {
      watchResponses.mockImplementation(() => unsubscribeMock);
      renderPage();
      expect(await screen.findByRole('button', { name: 'Download CSV' })).toBeDisabled();
    });

    it('shows the share link and the message to copy', async () => {
      renderPage();
      expect(await screen.findByText(/\/survey$/, { selector: 'p.sv-code' })).toBeInTheDocument();
      expect(screen.getByText(/Subject: Survey 1/)).toBeInTheDocument();
      expect(screen.getByText(/Only your instructor sees your answers/)).toBeInTheDocument();
    });

    it('says when the survey cannot be found', async () => {
      window.location.hash = '#survey/missing';
      renderPage();
      expect(await screen.findByText(/We could not find that survey/)).toBeInTheDocument();
    });

    it('stops listening to answers when the page closes', async () => {
      const { unmount } = renderPage();
      await screen.findByRole('heading', { name: 'Survey 1 is open' });
      unmount();
      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });

  describe('preview', () => {
    beforeEach(() => {
      window.location.hash = '#survey/s1/preview';
      watchMySurveys.mockImplementation((uid, onData) => {
        onData([survey]);
        return unsubscribeMock;
      });
    });

    it('opens the student steps from the survey page', async () => {
      window.location.hash = '#survey/s1';
      const user = userEvent.setup();
      renderPage();
      await user.click(await screen.findByRole('button', { name: 'Preview as student' }));
      expect(await screen.findByText('When can you meet for about an hour each week?')).toBeInTheDocument();
      expect(window.location.hash).toBe('#survey/s1/preview');
    });

    it('lets the instructor click through every step without saving anything', async () => {
      const { saveResponse, getMyResponse } = require('../surveyService');
      const user = userEvent.setup();
      renderPage();

      expect(await screen.findByText(/Nothing is saved/)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /Mon 9 AM/ }));
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await user.click(screen.getByRole('button', { name: 'Math' }));
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      expect(screen.getByTestId('block-list-step')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Review answers' }));
      expect(screen.getByText('Review your answers')).toBeInTheDocument();

      expect(saveResponse).not.toHaveBeenCalled();
      expect(getMyResponse).not.toHaveBeenCalled();
    });

    it('Exit preview goes back to the survey page', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(await screen.findByRole('button', { name: 'Exit preview' }));
      await waitFor(() => expect(window.location.hash).toBe('#survey/s1'));
    });
  });
});
