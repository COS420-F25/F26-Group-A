import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

global.fetch = global.fetch || jest.fn();

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase';
import { createProfile } from '../accounts';
import FirebaseAuth from '../FirebaseAuth.jsx';

// ---------- Mocks ----------
const mockUseUserProfile = jest.fn();

jest.mock('../useUserProfile', () => ({
  useUserProfile: () => mockUseUserProfile(),
}));

jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithPopup: jest.fn(),
  updateProfile: jest.fn(),
  signOut: jest.fn(),
  // used with `new`, so it must be a real class
  GoogleAuthProvider: class GoogleAuthProvider {},
}));

jest.mock('../firebase', () => ({ auth: { name: 'mock-auth' } }));
jest.mock('../accounts', () => ({ createProfile: jest.fn() }));

// ---------- Fixtures & helpers ----------
const fbUser = { uid: 'u1', email: 'jane@example.com', displayName: 'Jane Doe' };
const loggedOut = { user: null, profile: null, loading: false };
const loading = { user: null, profile: null, loading: true };
const noRole = { user: fbUser, profile: null, loading: false };
const signedIn = {
  user: fbUser,
  profile: { role: 'student', displayName: 'Jane Doe' },
  loading: false,
};

const makeErr = (code, message = 'raw firebase message') =>
  Object.assign(new Error(message), { code });

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

// A <button> with no type attribute reports `.type === 'submit'` in the DOM
// (HTML default). Only match buttons that explicitly declare type="submit",
// otherwise the compact toggle / Google / mode-switch buttons can match first.
const submitButton = () =>
  screen.getAllByRole('button').find((b) => b.getAttribute('type') === 'submit');

function renderAuth(hookState = loggedOut, props = {}) {
  mockUseUserProfile.mockReturnValue(hookState);
  const user = userEvent.setup();
  const utils = render(<FirebaseAuth {...props} />);
  return { user, ...utils };
}

async function openPopover(user) {
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

async function fillSignIn(user, email = 'jane@example.com', password = 'hunter22') {
  await user.type(screen.getByPlaceholderText('Email'), email);
  await user.type(screen.getByPlaceholderText('Password'), password);
}

async function switchToSignUp(user) {
  await user.click(screen.getByRole('button', { name: 'Create one' }));
}

async function fillSignUp(
  user,
  { name = 'Jane Doe', email = 'jane@example.com', password = 'hunter22' } = {}
) {
  await user.type(screen.getByPlaceholderText('Name'), name);
  await fillSignIn(user, email, password);
}

beforeEach(() => {
  jest.resetAllMocks();
  mockUseUserProfile.mockReturnValue(loggedOut);
  signInWithEmailAndPassword.mockResolvedValue({ user: fbUser });
  createUserWithEmailAndPassword.mockResolvedValue({ user: fbUser });
  updateProfile.mockResolvedValue();
  createProfile.mockResolvedValue();
  signInWithPopup.mockResolvedValue({ user: fbUser });
  signOut.mockResolvedValue();
});

// =====================================================================
// 1. AUTH FLOW TRIGGERS
// =====================================================================
describe('FirebaseAuth – auth flow triggers', () => {
  describe('sign in', () => {
    it('calls signInWithEmailAndPassword with auth, email and password', async () => {
      const { user } = renderAuth();
      await fillSignIn(user, 'a@b.com', 'secret123');
      await user.click(submitButton());

      expect(signInWithEmailAndPassword).toHaveBeenCalledTimes(1);
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(auth, 'a@b.com', 'secret123');
    });

    it('does NOT create an account or profile when signing in', async () => {
      const { user } = renderAuth();
      await fillSignIn(user);
      await user.click(submitButton());

      await waitFor(() => expect(signInWithEmailAndPassword).toHaveBeenCalled());
      expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
      expect(createProfile).not.toHaveBeenCalled();
    });

    it('disables the submit button while pending, then re-enables it', async () => {
      const d = deferred();
      signInWithEmailAndPassword.mockReturnValue(d.promise);
      const { user } = renderAuth();
      await fillSignIn(user);
      await user.click(submitButton());

      await waitFor(() => expect(submitButton()).toBeDisabled());
      d.resolve({ user: fbUser });
      await waitFor(() => expect(submitButton()).toBeEnabled());
    });

    it('works from the compact popover', async () => {
      const { user } = renderAuth(loggedOut, { compact: true });
      await openPopover(user);
      await screen.findByPlaceholderText('Email');

      await fillSignIn(user, 'c@d.com', 'pw123456');
      await user.click(submitButton());

      await waitFor(() =>
        expect(signInWithEmailAndPassword).toHaveBeenCalledWith(auth, 'c@d.com', 'pw123456')
      );
    });

    it('Firebase check when user logs in', async () => {
      signInWithEmailAndPassword.mockResolvedValueOnce({
        user: { uid: '123' },
      });
      const { user } = renderAuth();
      await fillSignIn(user, 'test@example.com', 'password123');
      await user.click(submitButton());

      await waitFor(() => expect(signInWithEmailAndPassword).toHaveBeenCalled());
    });
  });

  describe('sign up', () => {
    it('shows Name and role fields only in sign-up mode', async () => {
      const { user } = renderAuth();
      expect(screen.queryByPlaceholderText('Name')).not.toBeInTheDocument();
      expect(screen.queryByRole('radio', { name: /student/i })).not.toBeInTheDocument();

      await switchToSignUp(user);

      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /student/i })).toBeChecked();
      expect(screen.getByRole('radio', { name: /instructor/i })).not.toBeChecked();
    });

    it('creates the account, sets a trimmed display name, then saves the profile (student)', async () => {
      const newUser = { uid: 'new1', email: 'n@x.com' };
      createUserWithEmailAndPassword.mockResolvedValue({ user: newUser });
      const { user } = renderAuth();
      await switchToSignUp(user);
      await fillSignUp(user, { name: '  Jane Doe  ', email: 'n@x.com', password: 'hunter22' });
      await user.click(screen.getByRole('button', { name: 'Create account' }));

      await waitFor(() => expect(createProfile).toHaveBeenCalled());
      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(auth, 'n@x.com', 'hunter22');
      expect(updateProfile).toHaveBeenCalledWith(newUser, { displayName: 'Jane Doe' });
      expect(createProfile).toHaveBeenCalledWith(newUser, {
        role: 'student',
        displayName: 'Jane Doe',
        instructorCode: '',
      });
      expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
    });

    it('runs create → updateProfile → createProfile in that order', async () => {
      const { user } = renderAuth();
      await switchToSignUp(user);
      await fillSignUp(user);
      await user.click(screen.getByRole('button', { name: 'Create account' }));

      await waitFor(() => expect(createProfile).toHaveBeenCalled());
      const order = (fn) => fn.mock.invocationCallOrder[0];
      expect(order(createUserWithEmailAndPassword)).toBeLessThan(order(updateProfile));
      expect(order(updateProfile)).toBeLessThan(order(createProfile));
    });

    it('hides the instructor code for students and reveals it for instructors', async () => {
      const { user } = renderAuth();
      await switchToSignUp(user);
      expect(screen.queryByPlaceholderText('Instructor code')).not.toBeInTheDocument();

      await user.click(screen.getByRole('radio', { name: /instructor/i }));
      expect(screen.getByPlaceholderText('Instructor code')).toBeInTheDocument();

      await user.click(screen.getByRole('radio', { name: /student/i }));
      expect(screen.queryByPlaceholderText('Instructor code')).not.toBeInTheDocument();
    });

    it('sends role=instructor and the typed code to createProfile', async () => {
      const { user } = renderAuth();
      await switchToSignUp(user);
      await fillSignUp(user);
      await user.click(screen.getByRole('radio', { name: /instructor/i }));
      await user.type(screen.getByPlaceholderText('Instructor code'), 'LETMEIN');
      await user.click(screen.getByRole('button', { name: 'Create account' }));

      await waitFor(() => expect(createProfile).toHaveBeenCalled());
      expect(createProfile).toHaveBeenCalledWith(
        fbUser,
        expect.objectContaining({ role: 'instructor', instructorCode: 'LETMEIN' })
      );
    });

    it('does not call updateProfile/createProfile if account creation fails', async () => {
      createUserWithEmailAndPassword.mockRejectedValue(makeErr('auth/email-already-in-use'));
      const { user } = renderAuth();
      await switchToSignUp(user);
      await fillSignUp(user);
      await user.click(screen.getByRole('button', { name: 'Create account' }));

      await screen.findByText(/already exists/i);
      expect(updateProfile).not.toHaveBeenCalled();
      expect(createProfile).not.toHaveBeenCalled();
    });

    it('can switch back to sign-in mode', async () => {
      const { user } = renderAuth();
      await switchToSignUp(user);
      await user.click(screen.getByRole('button', { name: 'Sign in' }));

      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Name')).not.toBeInTheDocument();
    });
  });

  describe('Google sign-in', () => {
    it('calls signInWithPopup with auth and a GoogleAuthProvider', async () => {
      const { user } = renderAuth();
      await user.click(screen.getByRole('button', { name: /continue with google/i }));

      expect(signInWithPopup).toHaveBeenCalledTimes(1);
      expect(signInWithPopup).toHaveBeenCalledWith(auth, expect.any(GoogleAuthProvider));
    });
  });

  describe('sign out', () => {
    it('full view: calls signOut(auth)', async () => {
      const { user } = renderAuth(signedIn);
      await user.click(screen.getByRole('button', { name: 'Sign out' }));
      expect(signOut).toHaveBeenCalledWith(auth);
    });

    it('compact view: calls signOut(auth)', async () => {
      const { user } = renderAuth(signedIn, { compact: true });
      await user.click(screen.getByRole('button', { name: 'Sign out' }));
      expect(signOut).toHaveBeenCalledWith(auth);
    });

    it('finish-setup view: calls signOut(auth)', async () => {
      const { user } = renderAuth(noRole);
      await user.click(screen.getByRole('button', { name: 'Sign out' }));
      expect(signOut).toHaveBeenCalledWith(auth);
    });
  });

  describe('finish setup (signed in, no role)', () => {
    it("saves a student profile using the user's displayName", async () => {
      const { user } = renderAuth(noRole);
      await user.click(screen.getByRole('button', { name: 'Continue' }));

      await waitFor(() => expect(createProfile).toHaveBeenCalled());
      expect(createProfile).toHaveBeenCalledWith(fbUser, {
        role: 'student',
        displayName: 'Jane Doe',
        instructorCode: '',
      });
    });

    it('saves an instructor profile with the code', async () => {
      const { user } = renderAuth(noRole);
      await user.click(screen.getByRole('radio', { name: /instructor/i }));
      await user.type(screen.getByPlaceholderText('Instructor code'), 'SECRET');
      await user.click(screen.getByRole('button', { name: 'Continue' }));

      await waitFor(() => expect(createProfile).toHaveBeenCalled());
      expect(createProfile).toHaveBeenCalledWith(fbUser, {
        role: 'instructor',
        displayName: 'Jane Doe',
        instructorCode: 'SECRET',
      });
    });

    it('falls back to the email prefix when there is no displayName', async () => {
      const u = { uid: 'u2', email: 'sam.smith@example.com', displayName: null };
      const { user } = renderAuth({ user: u, profile: null, loading: false });
      await user.click(screen.getByRole('button', { name: 'Continue' }));

      await waitFor(() => expect(createProfile).toHaveBeenCalled());
      expect(createProfile).toHaveBeenCalledWith(
        u,
        expect.objectContaining({ displayName: 'sam.smith' })
      );
    });

    it('falls back to an empty string when there is neither displayName nor email', async () => {
      const u = { uid: 'u3', email: null, displayName: null };
      const { user } = renderAuth({ user: u, profile: null, loading: false });
      await user.click(screen.getByRole('button', { name: 'Continue' }));

      await waitFor(() => expect(createProfile).toHaveBeenCalled());
      expect(createProfile).toHaveBeenCalledWith(
        u,
        expect.objectContaining({ displayName: '' })
      );
    });
  });
});

// =====================================================================
// 2. ERROR MESSAGES
// =====================================================================
describe('FirebaseAuth – error messages', () => {
  it('shows no error initially', () => {
    renderAuth();
    expect(
      screen.queryByText(/wrong email|already exists|at least 6|not accepted/i)
    ).not.toBeInTheDocument();
  });

  it.each([['auth/invalid-credential'], ['auth/wrong-password'], ['auth/user-not-found']])(
    "sign-in failure %s shows 'Wrong email or password.'",
    async (code) => {
      signInWithEmailAndPassword.mockRejectedValue(makeErr(code, 'Firebase: raw text'));
      const { user } = renderAuth();
      await fillSignIn(user);
      await user.click(submitButton());

      expect(await screen.findByText('Wrong email or password.')).toBeInTheDocument();
      expect(screen.queryByText(/Firebase: raw text/)).not.toBeInTheDocument();
    }
  );

  it('sign-up with auth/email-already-in-use shows the friendly message', async () => {
    createUserWithEmailAndPassword.mockRejectedValue(makeErr('auth/email-already-in-use'));
    const { user } = renderAuth();
    await switchToSignUp(user);
    await fillSignUp(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      await screen.findByText('An account with that email already exists.')
    ).toBeInTheDocument();
  });

  it('sign-up with auth/weak-password shows the friendly message', async () => {
    createUserWithEmailAndPassword.mockRejectedValue(makeErr('auth/weak-password'));
    const { user } = renderAuth();
    await switchToSignUp(user);
    await fillSignUp(user, { password: '123' });
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      await screen.findByText('Password must be at least 6 characters.')
    ).toBeInTheDocument();
  });

  it('sign-up with a rejected instructor code (permission-denied) shows the friendly message', async () => {
    createProfile.mockRejectedValue(makeErr('permission-denied'));
    const { user } = renderAuth();
    await switchToSignUp(user);
    await fillSignUp(user);
    await user.click(screen.getByRole('radio', { name: /instructor/i }));
    await user.type(screen.getByPlaceholderText('Instructor code'), 'WRONG');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('The instructor code was not accepted.')).toBeInTheDocument();
  });

  it('finish-setup with a rejected instructor code shows the friendly message and keeps the form', async () => {
    createProfile.mockRejectedValue(makeErr('permission-denied'));
    const { user } = renderAuth(noRole);
    await user.click(screen.getByRole('radio', { name: /instructor/i }));
    await user.type(screen.getByPlaceholderText('Instructor code'), 'WRONG');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('The instructor code was not accepted.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
  });

  it('falls back to err.message for unknown error codes', async () => {
    signInWithEmailAndPassword.mockRejectedValue(
      makeErr('auth/too-many-requests', 'Too many attempts, slow down.')
    );
    const { user } = renderAuth();
    await fillSignIn(user);
    await user.click(submitButton());

    expect(await screen.findByText('Too many attempts, slow down.')).toBeInTheDocument();
  });

  it('shows an error when Google sign-in fails', async () => {
    signInWithPopup.mockRejectedValue(
      makeErr('auth/popup-closed-by-user', 'Popup closed before finishing.')
    );
    const { user } = renderAuth();
    await user.click(screen.getByRole('button', { name: /continue with google/i }));

    expect(await screen.findByText('Popup closed before finishing.')).toBeInTheDocument();
  });

  it('clears a previous error when the user submits again', async () => {
    signInWithEmailAndPassword
      .mockRejectedValueOnce(makeErr('auth/invalid-credential'))
      .mockResolvedValueOnce({ user: fbUser });
    const { user } = renderAuth();
    await fillSignIn(user);
    await user.click(submitButton());
    await screen.findByText('Wrong email or password.');

    await user.click(submitButton());
    await waitFor(() =>
      expect(screen.queryByText('Wrong email or password.')).not.toBeInTheDocument()
    );
  });

  it('re-enables the submit button after a failure', async () => {
    signInWithEmailAndPassword.mockRejectedValue(makeErr('auth/invalid-credential'));
    const { user } = renderAuth();
    await fillSignIn(user);
    await user.click(submitButton());

    await screen.findByText('Wrong email or password.');
    expect(submitButton()).toBeEnabled();
  });
});

// =====================================================================
// 3. STATE SYNCHRONIZATION
// =====================================================================
describe('FirebaseAuth – state synchronization', () => {
  describe('loading', () => {
    it("full: shows 'Loading...' and no form", () => {
      renderAuth(loading);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Email')).not.toBeInTheDocument();
    });

    it('compact: renders nothing', () => {
      const { container } = renderAuth(loading, { compact: true });
      expect(container).toBeEmptyDOMElement();
    });

    it('does not flash the finish-setup form while a signed-in user is still loading', () => {
      renderAuth({ user: fbUser, profile: null, loading: true });
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Finish setting up')).not.toBeInTheDocument();
    });
  });

  describe('logged out', () => {
    it('full: shows sign-in form, no sign-out button', () => {
      renderAuth(loggedOut);
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
    });

    it('compact: popover is closed by default', () => {
      renderAuth(loggedOut, { compact: true });
      const toggle = screen.getByRole('button', { name: 'Sign in' });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByPlaceholderText('Email')).not.toBeInTheDocument();
    });

    it('compact: toggle opens and closes the popover', async () => {
      const { user } = renderAuth(loggedOut, { compact: true });
      const toggle = screen.getByRole('button', { name: 'Sign in' });

      await user.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();

      await user.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByPlaceholderText('Email')).not.toBeInTheDocument();
    });
  });

  describe('signed in with a role', () => {
    it('full: shows name, role badge and Sign out; no form', () => {
      renderAuth(signedIn);
      expect(screen.getByText(/Signed in as Jane Doe/)).toBeInTheDocument();
      expect(screen.getByText('student')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Email')).not.toBeInTheDocument();
    });

    it('compact: shows name, role and Sign out inline', () => {
      renderAuth(
        { ...signedIn, profile: { role: 'instructor', displayName: 'Prof X' } },
        { compact: true }
      );
      expect(screen.getByText('Prof X')).toBeInTheDocument();
      expect(screen.getByText('instructor')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    });

    it('name falls back: profile.displayName → user.displayName → user.email', () => {
      const first = renderAuth({
        user: { ...fbUser, displayName: 'Auth Name' },
        profile: { role: 'student', displayName: 'Profile Name' },
        loading: false,
      });
      expect(screen.getByText(/Profile Name/)).toBeInTheDocument();
      first.unmount();

      const second = renderAuth({
        user: { ...fbUser, displayName: 'Auth Name' },
        profile: { role: 'student' },
        loading: false,
      });
      expect(screen.getByText(/Auth Name/)).toBeInTheDocument();
      second.unmount();

      renderAuth({
        user: { ...fbUser, displayName: null },
        profile: { role: 'student' },
        loading: false,
      });
      expect(screen.getByText(/jane@example\.com/)).toBeInTheDocument();
    });
  });

  describe('signed in without a role', () => {
    it('full: shows the finish-setup form instead of sign-in', () => {
      renderAuth(noRole);
      expect(screen.getByRole('heading', { name: 'Finish setting up' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Email')).not.toBeInTheDocument();
      expect(screen.queryByText(/Signed in as/)).not.toBeInTheDocument();
    });

    it("compact: popover opens automatically and shows 'Choose role'", async () => {
      renderAuth(noRole, { compact: true });
      const toggle = screen.getByRole('button', { name: 'Choose role' });
      expect(await screen.findByText('Finish setting up')).toBeInTheDocument();
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
    });

    it('compact: popover can be dismissed manually', async () => {
      const { user } = renderAuth(noRole, { compact: true });
      await screen.findByText('Finish setting up');
      await user.click(screen.getByRole('button', { name: 'Choose role' }));
      expect(screen.queryByText('Finish setting up')).not.toBeInTheDocument();
    });
  });

  describe('transitions', () => {
    it('logged out → logged in swaps the form for the signed-in view', () => {
      const { rerender } = renderAuth(loggedOut);
      expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();

      mockUseUserProfile.mockReturnValue(signedIn);
      rerender(<FirebaseAuth />);

      expect(screen.queryByPlaceholderText('Email')).not.toBeInTheDocument();
      expect(screen.getByText(/Signed in as Jane Doe/)).toBeInTheDocument();
    });

    it('logged in → logged out swaps back to the sign-in form', () => {
      const { rerender } = renderAuth(signedIn);
      mockUseUserProfile.mockReturnValue(loggedOut);
      rerender(<FirebaseAuth />);

      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
      expect(screen.queryByText(/Signed in as/)).not.toBeInTheDocument();
    });

    it('loading → logged out reveals the form', () => {
      const { rerender } = renderAuth(loading);
      mockUseUserProfile.mockReturnValue(loggedOut);
      rerender(<FirebaseAuth />);
      expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    });

    it('compact: popover auto-opens when a user appears without a role, and closes once a profile exists', async () => {
      const { rerender } = renderAuth(loggedOut, { compact: true });
      expect(screen.queryByText('Finish setting up')).not.toBeInTheDocument();

      mockUseUserProfile.mockReturnValue(noRole);
      rerender(<FirebaseAuth compact />);
      expect(await screen.findByText('Finish setting up')).toBeInTheDocument();

      mockUseUserProfile.mockReturnValue(signedIn);
      rerender(<FirebaseAuth compact />);
      expect(screen.queryByText('Finish setting up')).not.toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    it("shows 'Loading...' (not finish-setup) while the role is being saved right after sign-up", async () => {
      const profileSave = deferred();
      createProfile.mockReturnValue(profileSave.promise);

      const { user, rerender } = renderAuth(loggedOut);
      await switchToSignUp(user);
      await fillSignUp(user);
      await user.click(screen.getByRole('button', { name: 'Create account' }));
      await waitFor(() => expect(createProfile).toHaveBeenCalled());

      // Firebase now reports a user, but no profile yet
      mockUseUserProfile.mockReturnValue(noRole);
      rerender(<FirebaseAuth />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Finish setting up')).not.toBeInTheDocument();

      // profile saved → signed-in view
      mockUseUserProfile.mockReturnValue(signedIn);
      profileSave.resolve();
      rerender(<FirebaseAuth />);
      expect(await screen.findByText(/Signed in as Jane Doe/)).toBeInTheDocument();
    });

    it('after a failed instructor code at sign-up, finish-setup shows the error so they can retry', async () => {
      createProfile.mockRejectedValueOnce(makeErr('permission-denied'));
      const { user, rerender } = renderAuth(loggedOut);
      await switchToSignUp(user);
      await fillSignUp(user);
      await user.click(screen.getByRole('radio', { name: /instructor/i }));
      await user.type(screen.getByPlaceholderText('Instructor code'), 'BAD');
      await user.click(screen.getByRole('button', { name: 'Create account' }));
      await screen.findByText('The instructor code was not accepted.');

      // account now exists with no role
      mockUseUserProfile.mockReturnValue(noRole);
      rerender(<FirebaseAuth />);

      expect(screen.getByText('Finish setting up')).toBeInTheDocument();
      expect(screen.getByText('The instructor code was not accepted.')).toBeInTheDocument();
    });
  });
});
