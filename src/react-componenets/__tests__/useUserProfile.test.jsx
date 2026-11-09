import { renderHook, waitFor } from '@testing-library/react';

// Mock firebase modules completely to prevent ESM loading issues in Jest
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  onSnapshot: jest.fn(),
}));

jest.mock('../firebase', () => ({
  auth: {},
  db: {},
}), { virtual: true });

import { useUserProfile } from '../useUserProfile';
import { onAuthStateChanged } from 'firebase/auth';
import { onSnapshot } from 'firebase/firestore';

global.fetch = global.fetch || jest.fn();

describe('useUserProfile Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns loading state initially with unauthenticated user', () => {
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null);
      return jest.fn();
    });

    const { result } = renderHook(() => useUserProfile());

    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.role).toBeNull();
  });

  it('loads user profile successfully when authenticated', async () => {
    const mockUser = { uid: 'u1', email: 'test@example.com' };
    const mockProfileData = { role: 'instructor', displayName: 'Dr. Test' };

    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(mockUser);
      return jest.fn();
    });

    onSnapshot.mockImplementation((ref, onSuccess) => {
      onSuccess({
        exists: () => true,
        data: () => mockProfileData,
      });
      return jest.fn();
    });

    const { result } = renderHook(() => useUserProfile());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.profile).toEqual(mockProfileData);
    expect(result.current.role).toEqual('instructor');
  });
});
