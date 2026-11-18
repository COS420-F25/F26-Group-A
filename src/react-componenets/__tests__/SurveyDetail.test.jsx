import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SurveyDetail from '../content/SurveyDetail';
import * as surveyService from '../utils/surveyService';
import * as csvUtils from '../utils/csv';

jest.mock('../utils/surveyService', () => ({
  watchResponses: jest.fn((id, cb) => {
    cb([
      { uid: 'u1', name: 'Alice', email: 'alice@x.com', answers: { q1: ['Math'] } },
    ]);
    return () => {};
  }),
  getStudents: jest.fn().mockResolvedValue([
    { uid: 'u1', name: 'Alice', email: 'alice@x.com' },
    { uid: 'u2', name: 'Bob', email: 'bob@x.com' },
  ]),
  setSurveyStatus: jest.fn().mockResolvedValue(),
}), { virtual: true });

jest.mock('../utils/csv', () => ({
  csvFileName: (title) => `${title}.csv`,
  responsesToCsv: jest.fn(() => 'csv-data'),
  downloadCsv: jest.fn(),
}), { virtual: true });

describe('SurveyDetail Component', () => {
  const mockSurvey = {
    id: 's-1',
    title: 'Advanced Physics',
    description: 'Final project survey',
    status: 'open',
    startHour: 9,
    endHour: 17,
    questions: [{ id: 'q1', type: 'interests', label: 'Interests' }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders survey details, progress, share link, and responses table', async () => {
    render(<SurveyDetail survey={mockSurvey} />);

    expect(await screen.findByText('Advanced Physics is open')).toBeInTheDocument();
    expect(screen.getByText('1 of 2')).toBeInTheDocument(); // 1 out of 2 students answered
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('allows toggling survey open/closed status', async () => {
    const userEventSetup = userEvent.setup();
    render(<SurveyDetail survey={mockSurvey} />);

    const closeBtn = await screen.findByRole('button', { name: 'Close survey' });
    await userEventSetup.click(closeBtn);

    await waitFor(() => {
      expect(surveyService.setSurveyStatus).toHaveBeenCalledWith('s-1', 'closed');
    });
  });

  it('triggers CSV download when download button is clicked', async () => {
    const userEventSetup = userEvent.setup();
    render(<SurveyDetail survey={mockSurvey} />);

    const downloadBtn = await screen.findByRole('button', { name: 'Download CSV' });
    await userEventSetup.click(downloadBtn);

    // csvFileName is mocked above, so it just adds ".csv" to the title
    expect(csvUtils.responsesToCsv).toHaveBeenCalledWith(
      [expect.objectContaining({ uid: 'u1', name: 'Alice' })],
      mockSurvey.questions
    );
    expect(csvUtils.downloadCsv).toHaveBeenCalledWith('Advanced Physics.csv', 'csv-data');
  });
});
