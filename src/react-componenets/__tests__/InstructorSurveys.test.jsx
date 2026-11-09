import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InstructorSurveys from '../InstructorSurveys.jsx';
import { watchMySurveys, sendSurvey, getResponses, setSurveyStatus } from '../surveyService';

jest.mock('../surveyService', () => ({
  DEFAULT_TAGS: ['Math', 'Programming'],
  watchMySurveys: jest.fn(),
  sendSurvey: jest.fn(),
  getResponses: jest.fn(),
  setSurveyStatus: jest.fn(),
}));

jest.mock('../csv', () => ({
  csvFileName: (title) => `${title}.csv`,
  responsesToCsv: jest.fn(() => 'csv-data'),
  downloadCsv: jest.fn(),
}));

describe('InstructorSurveys Component', () => {
  const mockUser = { uid: 'inst-1' };
  let unsubscribeMock;

  beforeEach(() => {
    jest.clearAllMocks();
    unsubscribeMock = jest.fn();
    watchMySurveys.mockImplementation((uid, onData) => {
      onData([]);
      return unsubscribeMock;
    });
  });

  it('displays loading state initially and then empty state', async () => {
    watchMySurveys.mockImplementationOnce(() => unsubscribeMock);
    render(<InstructorSurveys user={mockUser} />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders sent surveys when returned from subscription', async () => {
    const surveys = [
      { id: 's1', title: 'Survey 1', startHour: 9, endHour: 17, tags: ['Math'], status: 'open' },
    ];
    watchMySurveys.mockImplementationOnce((uid, onData) => {
      onData(surveys);
      return unsubscribeMock;
    });

    render(<InstructorSurveys user={mockUser} />);
    expect(await screen.findByText('Survey 1')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('allows creating a new survey via SurveyBuilder', async () => {
    sendSurvey.mockResolvedValue('new-id');
    const user = userEvent.setup();
    render(<InstructorSurveys user={mockUser} />);

    await user.type(screen.getByLabelText('Title'), 'New Quiz');
    await user.click(screen.getByRole('button', { name: 'Send to students' }));

    await waitFor(() => {
      expect(sendSurvey).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({ title: 'New Quiz' })
      );
    });
  });
});
