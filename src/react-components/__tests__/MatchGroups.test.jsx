import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import SurveyDetail from '../content/SurveyDetail';
import InstructorSurveys from '../structure/InstructorSurveys';

const survey = {
  id: 'abc123',
  title: 'Week 1',
  status: 'closed',
  startHour: 9,
  endHour: 17,
  questions: [],
  createdAt: { toDate: () => new Date() },
};

jest.mock('../utils/surveyService', () => ({
  watchMySurveys: jest.fn((uid, onData) => {
    onData([survey]);
    return () => {};
  }),
  watchResponses: jest.fn((id, onData) => {
    onData([]);
    return () => {};
  }),
  getStudents: jest.fn().mockResolvedValue([]),
  setSurveyStatus: jest.fn(),
}));
jest.mock('../utils/groupService', () => ({ firebaseGroupService: {} }));
jest.mock('../content/ReviewGroups', () => (props) => <div>Review groups for {props.surveyId}</div>);

afterEach(() => {
  window.location.hash = '';
});

test('the survey page has a Match groups button that opens this survey’s groups', async () => {
  render(<SurveyDetail survey={survey} />);
  const link = await screen.findByRole('link', { name: 'Match groups' });
  expect(link).toHaveAttribute('href', '#survey/abc123/groups');
});

test('#survey/<id>/groups shows the Review groups screen for that survey', () => {
  window.location.hash = '#survey/abc123/groups';
  render(<InstructorSurveys user={{ uid: 'prof' }} profile={{ role: 'instructor' }} />);
  expect(screen.getByText('Review groups for abc123')).toBeInTheDocument();
});
