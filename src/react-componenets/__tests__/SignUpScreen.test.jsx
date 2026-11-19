import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { createProfile } from '../accounts';
import SignUpScreen from '../SignUpScreen.jsx';
import { navigate } from '../authShared.jsx';

const mockUseUserProfile = jest.fn();
jest.mock('../useUserProfile', () => ({ useUserProfile: () => mockUseUserProfile() }));
jest.mock('firebase/auth', () => ({
    createUserWithEmailAndPassword: jest.fn(),
    updateProfile: jest.fn(),
    signInWithPopup: jest.fn(),
    signOut: jest.fn(),
    GoogleAuthProvider: class GoogleAuthProvider {}
}));
jest.mock('../firebase', () => ({ auth: { name: 'mock-auth' } }));
jest.mock('../accounts', () => ({ createProfile: jest.fn() }));

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(navigate, 'to').mockImplementation(() => {});
    mockUseUserProfile.mockReturnValue({ user: null, profile: null, loading: false });
});

describe('SignUpScreen', () => {
    it('starts by asking for a role and links to sign in', () => {
        render(<SignUpScreen />);
        expect(screen.getByRole('button', { name: /student/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /instructor/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/signin');
    });

    it('creates a student account and saves the role', async () => {
        const user = { uid: 'u1', email: 'a@b.com' };
        createUserWithEmailAndPassword.mockResolvedValue({ user });
        render(<SignUpScreen />);
        await userEvent.click(screen.getByRole('button', { name: /student/i }));
        expect(screen.queryByLabelText('Instructor code')).not.toBeInTheDocument();
        await userEvent.type(screen.getByLabelText('Name'), 'Jane Doe');
        await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
        await userEvent.type(screen.getByLabelText('Password'), 'secret12');
        await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
        await waitFor(() =>
            expect(createProfile).toHaveBeenCalledWith(user, {
                role: 'student', displayName: 'Jane Doe', instructorCode: ''
            })
        );
        expect(updateProfile).toHaveBeenCalledWith(user, { displayName: 'Jane Doe' });
    });

    it('asks instructors for the instructor code', async () => {
        render(<SignUpScreen />);
        await userEvent.click(screen.getByRole('button', { name: /instructor/i }));
        expect(screen.getByLabelText('Instructor code')).toBeInTheDocument();
    });

    it('can go back to change the role', async () => {
        render(<SignUpScreen />);
        await userEvent.click(screen.getByRole('button', { name: /student/i }));
        await userEvent.click(screen.getByRole('button', { name: 'Change role' }));
        expect(screen.getByRole('button', { name: /instructor/i })).toBeInTheDocument();
    });

    it('sends someone who already has an account on to their page', () => {
        mockUseUserProfile.mockReturnValue({
            user: { uid: 'u1' }, profile: { role: 'instructor' }, loading: false
        });
        render(<SignUpScreen />);
        expect(navigate.to).toHaveBeenCalledWith('/instructor');
    });
});
