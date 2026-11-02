import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import RoleGate from '../RoleGate.jsx';

// 1. Mock the named export `useUserProfile`
const mockUseUserProfile = jest.fn();

jest.mock('../useUserProfile', () => ({
  useUserProfile: () => mockUseUserProfile(),
}));

// 2. Mock the UI styles module
jest.mock('../ui', () => ({
  styles: {
    page: {},
    muted: {},
  },
}));

describe('RoleGate Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state while profile data is fetching', () => {
    mockUseUserProfile.mockReturnValue({
      user: null,
      profile: null,
      loading: true,
      error: null,
    });

    render(
      <RoleGate allow="instructor">
        <div>Protected Content</div>
      </RoleGate>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders sign-in notice when user is not logged in', () => {
    mockUseUserProfile.mockReturnValue({
      user: null,
      profile: null,
      loading: false,
      error: null,
    });

    render(
      <RoleGate allow="instructor">
        <div>Protected Content</div>
      </RoleGate>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('Sign in to see this page.')).toBeInTheDocument();
  });

  it('renders error notice when error exists', () => {
    mockUseUserProfile.mockReturnValue({
      user: { uid: '123' },
      profile: null,
      loading: false,
      error: new Error('Database error'),
    });

    render(
      <RoleGate allow="instructor">
        <div>Protected Content</div>
      </RoleGate>
    );

    expect(
      screen.getByText('Could not load your account. Try refreshing the page.')
    ).toBeInTheDocument();
  });

  it('renders role setup notice when user is signed in but has no profile', () => {
    mockUseUserProfile.mockReturnValue({
      user: { uid: '123' },
      profile: null,
      loading: false,
      error: null,
    });

    render(
      <RoleGate allow="instructor">
        <div>Protected Content</div>
      </RoleGate>
    );

    expect(
      screen.getByText(
        'Choose your role with the button at the top right to finish setting up your account.'
      )
    ).toBeInTheDocument();
  });

  it('renders role restriction notice when user role is not allowed', () => {
    mockUseUserProfile.mockReturnValue({
      user: { uid: '123' },
      profile: { role: 'student' },
      loading: false,
      error: null,
    });

    render(
      <RoleGate allow="instructor">
        <div>Protected Content</div>
      </RoleGate>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(
      screen.getByText('This page is only for instructor accounts.')
    ).toBeInTheDocument();
  });

  it('renders children when user role matches string in `allow` prop', () => {
    mockUseUserProfile.mockReturnValue({
      user: { uid: '123' },
      profile: { role: 'instructor' },
      loading: false,
      error: null,
    });

    render(
      <RoleGate allow="instructor">
        <div>Protected Content</div>
      </RoleGate>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('renders children when user role matches array in `allow` prop', () => {
    mockUseUserProfile.mockReturnValue({
      user: { uid: '123' },
      profile: { role: 'instructor' },
      loading: false,
      error: null,
    });

    render(
      <RoleGate allow={['student', 'instructor']}>
        <div>Protected Content</div>
      </RoleGate>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('renders children for any signed-in user with a profile when `allow` is omitted', () => {
    mockUseUserProfile.mockReturnValue({
      user: { uid: '123' },
      profile: { role: 'student' },
      loading: false,
      error: null,
    });

    render(
      <RoleGate>
        <div>Protected Content</div>
      </RoleGate>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('supports children as a function receiving { user, profile }', () => {
    const mockUser = { uid: '123' };
    const mockProfile = { role: 'instructor', name: 'Dr. Smith' };

    mockUseUserProfile.mockReturnValue({
      user: mockUser,
      profile: mockProfile,
      loading: false,
      error: null,
    });

    render(
      <RoleGate allow="instructor">
        {({ user, profile }) => (
          <div>
            Welcome {profile.name} ({user.uid})
          </div>
        )}
      </RoleGate>
    );

    expect(screen.getByText('Welcome Dr. Smith (123)')).toBeInTheDocument();
  });
});
