import { createProfile } from '../accounts.js';
import { setDoc } from 'firebase/firestore';

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((db, col, id) => ({ col, id })),
  setDoc: jest.fn().mockResolvedValue(),
  serverTimestamp: jest.fn(() => 'mock-timestamp'),
}));

jest.mock('../firebase', () => ({
  db: {},
}), { virtual: true });

describe('accounts profile creation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createProfile saves student profile correctly without instructor code', async () => {
    const user = { uid: 'u1', email: 'student@x.com' };
    await createProfile(user, { role: 'student', displayName: 'Sam Student' });

    expect(setDoc).toHaveBeenCalledTimes(1);
    expect(setDoc).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        email: 'student@x.com',
        displayName: 'Sam Student',
        role: 'student',
        createdAt: 'mock-timestamp',
      })
    );
  });

  test('createProfile saves instructor profile with trimmed instructor code', async () => {
    const user = { uid: 'u2', email: 'prof@x.com' };
    await createProfile(user, { role: 'instructor', displayName: 'Dr. X', instructorCode: '  SECRET123 ' });

    expect(setDoc).toHaveBeenCalledTimes(1);
    expect(setDoc).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        email: 'prof@x.com',
        displayName: 'Dr. X',
        role: 'instructor',
        instructorCode: 'SECRET123',
        createdAt: 'mock-timestamp',
      })
    );
  });
});
