import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InstructorSurveys from '../structure/InstructorSurveys';
import * as surveyService from '../utils/surveyService';
import * as csvUtils from '../utils/csv';

jest.mock('../utils/surveyService', () => ({
  watchMySurveys: jest.fn((uid, cb) => {
    cb([
      {
        id: 's1',
        title: 'Test Survey',
        description: 'Test Desc',
        status: 'open',
        startHour: 9,
        endHour: 17,
        questions: [{ id: 'q1', type: 'interests', label: 'Interests' }],
        createdAt: { toDate: () => new Date() },
      },
    ]);
    return () => {};
  }),
  watchResponses: jest.fn((id, cb) => {
    cb([{ uid: 'u1', name: 'Alice', email: 'alice@x.com', answers: { q1: ['Math'] } }]);
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

describe('InstructorSurveys', () => {
  const user = { uid: 'inst-1', email: 'prof@x.com' };
  const profile = { role: 'instructor', displayName: 'Prof X' };

  it('renders sent surveys list by default', async () => {
    render(<InstructorSurveys user={user} profile={profile} />);
    expect(await screen.findByText('Test Survey')).toBeInTheDocument();
  });
});
