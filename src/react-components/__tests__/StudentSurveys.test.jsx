import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StudentSurveys from '@survey/StudentSurveys';

jest.mock('@survey/surveyService', () => ({
  watchOpenSurveys: jest.fn((cb) => {
    cb([
      {
        id: 's1',
        title: 'Open Survey',
        description: 'Please answer',
        status: 'open',
        startHour: 9,
        endHour: 17,
        questions: [],
        targetStudentUids: [],
      },
    ]);
    return () => {};
  }),
  getMyResponse: jest.fn().mockResolvedValue(null),
  saveResponse: jest.fn().mockResolvedValue(),
}), { virtual: true });

describe('StudentSurveys Component', () => {
  const user = { uid: 'student-1', email: 'student@x.com' };
  const profile = { role: 'student', displayName: 'Jane Doe' };

  it('renders open surveys list', async () => {
    render(<StudentSurveys user={user} profile={profile} />);
    expect(await screen.findByText('Open Survey')).toBeInTheDocument();
    expect(screen.getByText('Please answer')).toBeInTheDocument();
  });
});
