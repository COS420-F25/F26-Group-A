import { csvCell, csvFileName, responsesToCsv } from '@utils/csv.js';

describe('CSV Utilities', () => {
  test('csvCell handles formula injection protection and commas/quotes escaping', () => {
    expect(csvCell('normal')).toBe('normal');
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvCell('Hello, World')).toBe('"Hello, World"');
    expect(csvCell('He said "Hi"')).toBe('"He said ""Hi"""');
  });

  test('csvFileName creates clean lowercase hyphens slug', () => {
    expect(csvFileName('Week 1 Study Groups!')).toBe('week-1-study-groups-responses.csv');
    expect(csvFileName('')).toBe('survey-responses.csv');
  });

  test('responsesToCsv generates correct headers and formatted row values', () => {
    const responses = [
      {
        uid: 'u1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        updatedAt: { toDate: () => new Date('2026-11-01T12:00:00.000Z') },
        answers: { q1: ['Math', 'Science'], q2: ['Mon-09'] },
      },
    ];
    const questions = [
      { id: 'q1', type: 'interests', label: 'Topics' },
      { id: 'q2', type: 'availability', label: 'Free Time' },
    ];

    const csvOutput = responsesToCsv(responses, questions);
    expect(csvOutput).toContain('student_uid,name,email,updated_at,Topics,Free Time');
    expect(csvOutput).toContain('Jane Doe');
    expect(csvOutput).toContain('Math;Science');
    expect(csvOutput).toContain('Mon-09');
  });
});
