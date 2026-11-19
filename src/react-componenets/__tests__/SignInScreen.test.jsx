import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { createProfile } from '../accounts';
import SignInScreen from '../SignInScreen.jsx';
import { destinationFor, navigate } from '../authShared.jsx';

const mockUseUserProfile = jest.fn();
jest.mock('../useUserProfile', () => ({ useUserProfile: () => mockUseUserProfile() }));
jest.mock('firebase/auth', () => ({
    signInWithEmailAndPassword: jest.fn(),
    signInWithPopup: jest.fn(),
    signOut: jest.fn(),
    GoogleAuthProvider: class GoogleAuthProvider {}
}));
jest.mock('../firebase', () => ({ auth: { name: 'mock-auth' } }));
jest.mock('../accounts', () => ({ createProfile: jest.fn() }));

const fbUser = { uid: 'u1', email: 'jane@example.com', displayName: 'Jane' };
const loggedOut = { user: null, profile: null, loading: false };

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(navigate, 'to').mockImplementation(() => {});
    mockUseUserProfile.mockReturnValue(loggedOut);
});

describe('SignInScreen (signed out)', () => {
    it('renders Google button, fields and submit', () => {
        render(<SignInScreen />);
        expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
        expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
        expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
        expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/signup');
    });

    it('signs in with email and password', async () => {
        signInWithEmailAndPassword.mockResolvedValue({});
        render(<SignInScreen />);
        await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
        await userEvent.type(screen.getByLabelText('Password'), 'secret12');
        await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
        expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
            { name: 'mock-auth' }, 'jane@example.com', 'secret12'
        );
    });

    it('shows a friendly error for a wrong password', async () => {
        signInWithEmailAndPassword.mockRejectedValue(Object.assign(new Error('raw'), { code: 'auth/invalid-credential' }));
        render(<SignInScreen />);
        await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
        await userEvent.type(screen.getByLabelText('Password'), 'bad');
        await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Wrong email or password.');
    });

    it('continues with Google', async () => {
        signInWithPopup.mockResolvedValue({});
        render(<SignInScreen />);
        await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));
        expect(signInWithPopup).toHaveBeenCalled();
    });
});

describe('SignInScreen (signed in)', () => {
    it('sends an instructor to /instructor', () => {
        mockUseUserProfile.mockReturnValue({ user: fbUser, profile: { role: 'instructor' }, loading: false });
        render(<SignInScreen />);
        expect(navigate.to).toHaveBeenCalledWith('/instructor');
    });

    it('sends a student to /survey', () => {
        mockUseUserProfile.mockReturnValue({ user: fbUser, profile: { role: 'student' }, loading: false });
        render(<SignInScreen />);
        expect(navigate.to).toHaveBeenCalledWith('/survey');
    });

    it('asks for a role when the account has none', async () => {
        createProfile.mockResolvedValue();
        mockUseUserProfile.mockReturnValue({ user: fbUser, profile: null, loading: false });
        render(<SignInScreen />);
        expect(screen.getByRole('heading', { name: /finish setting up/i })).toBeInTheDocument();
        await userEvent.click(screen.getByLabelText('Student'));
        await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
        await waitFor(() =>
            expect(createProfile).toHaveBeenCalledWith(fbUser, expect.objectContaining({ role: 'student' }))
        );
        expect(navigate.to).not.toHaveBeenCalled();
    });
});

describe('destinationFor', () => {
    it('maps roles to pages', () => {
        expect(destinationFor('student')).toBe('/survey');
        expect(destinationFor('instructor')).toBe('/instructor');
        expect(destinationFor('nope')).toBe('/survey');
    });
});
