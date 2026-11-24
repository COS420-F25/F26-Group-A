import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
} from "firebase/auth";
import { auth } from "@authent/firebase";
import { createProfile } from "@authent/accounts";
import { friendlyError } from "@authent/authErrors.js";
import { authStyles as s } from "../styles/authStyles.js";
import {
  AuthCard,
  FinishSetup,
  GoogleButton,
  OrDivider,
  TextField,
  useRedirectWhenSignedIn,
} from "@authent/authShared.jsx";

// Real Firebase sign-up. Step 1: pick a role. Step 2: create the
// account (email + password, or Google) and save the role.

export const ROLES = [
  {
    value: "student",
    title: "Student",
    text: "Take surveys and see your group",
  },
  {
    value: "instructor",
    title: "Instructor",
    text: "Set up and manage reflection groups",
  },
];

export default function SignUpScreen() {
  const { user, profile, loading } = useRedirectWhenSignedIn();
  const [role, setRole] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name.trim() });
      await createProfile(cred.user, {
        role,
        displayName: name.trim(),
        instructorCode: code,
      });
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

  // Already have an account and a role: the hook is sending them on
  if (!busy && user && (loading || profile)) {
    return <AuthCard title="Signing you in…" />;
  }

  // Account exists but the role was not saved (Google, or a bad instructor code)
  if (!busy && user) {
    return (
      <AuthCard
        title="Finish setting up"
        subtitle="Choose your role to continue"
      >
        <FinishSetup initialRole={role ?? "student"} initialError={error} />
      </AuthCard>
    );
  }

  if (!role) {
    return (
      <AuthCard title="Create your account" subtitle="I'm signing up as a…">
        <div style={s.roleButtons}>
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              className="auth-choice"
              style={s.roleButton}
              onClick={() => setRole(r.value)}
            >
              <span style={s.roleTitle}>{r.title}</span>
              <span style={s.roleText}>{r.text}</span>
            </button>
          ))}
        </div>
        <p style={s.altLine}>
          Already have an account?{" "}
          <a href="/signin" className="auth-link" style={s.textLink}>
            Sign in
          </a>
        </p>
      </AuthCard>
    );
  }

  const roleTitle = ROLES.find((r) => r.value === role).title;

  return (
    <AuthCard
      title="Create your account"
      subtitle={`Signing up as ${roleTitle}`}
    >
      <form style={s.form} onSubmit={handleSubmit}>
        <GoogleButton onClick={handleGoogle} />
        <OrDivider />
        <TextField
          id="signup-name"
          label="Name"
          value={name}
          onChange={setName}
          autoComplete="name"
        />
        <TextField
          id="signup-email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />
        <TextField
          id="signup-password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        {role === "instructor" && (
          <TextField
            id="signup-code"
            label="Instructor code"
            type="password"
            value={code}
            onChange={setCode}
          />
        )}
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
          {busy ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p style={s.altLine}>
        <button
          type="button"
          className="auth-link"
          style={s.linkButton}
          onClick={() => {
            setRole(null);
            setError("");
          }}
        >
          Change role
        </button>
        {" · "}
        Already have an account?{" "}
        <a href="/signin" className="auth-link" style={s.textLink}>
          Sign in
        </a>
      </p>
    </AuthCard>
  );
}
