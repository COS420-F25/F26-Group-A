import { useState } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "@authent/firebase";
import { friendlyError } from "@authent/authErrors.js";
import { authStyles as s } from "../styles/authStyles.js";
import {
  AuthCard,
  FinishSetup,
  GoogleButton,
  OrDivider,
  TextField,
  useRedirectWhenSignedIn,
} from "./authShared.jsx";

// Real Firebase sign-in (email + password, or Google). Once signed in,
// the person is sent to the page for the role saved on their account.

export default function SignInScreen() {
  const { user, profile, loading } = useRedirectWhenSignedIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError("");
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  if (user && (loading || profile)) {
    return <AuthCard title="Signing you in…" />;
  }

  // Signed in with Google (or similar) but never picked a role
  if (user) {
    return (
      <AuthCard
        title="Finish setting up"
        subtitle="Choose your role to continue"
      >
        <FinishSetup />
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to your account">
      <form style={s.form} onSubmit={handleSubmit}>
        <GoogleButton onClick={handleGoogle} />
        <OrDivider />
        <TextField
          id="signin-email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />
        <TextField
          id="signin-password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
        {error && (
          <p role="alert" style={s.errorText}>
            {error}
          </p>
        )}
        <button
          type="submit"
          className="auth-btn"
          style={s.submitButton}
          disabled={busy}
        >
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p style={s.altLine}>
        New here?{" "}
        <a href="/signup" className="auth-link" style={s.textLink}>
          Sign up
        </a>
      </p>
    </AuthCard>
  );
}
