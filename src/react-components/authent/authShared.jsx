import { useEffect, useState } from "react";
import { navigate } from "@utils/navigate.js";
import { signOutAndGoHome } from "@authent/signOutAndGoHome.js";
import { createProfile } from "@authent/accounts";
import { useUserProfile } from "@authent/useUserProfile";
import { friendlyError } from "@authent/authErrors.js";
import { authStyles as s, AUTH_CSS } from "@/styles/authStyles.js";

// Pieces shared by the sign-in and sign-up screens.

export const DESTINATIONS = { student: "/survey", instructor: "/instructor" };

export function destinationFor(role) {
  return DESTINATIONS[role] ?? DESTINATIONS.student;
}

export { navigate };

export const ROLE_OPTIONS = [
  { value: "student", label: "Student" },
  { value: "instructor", label: "Instructor" },
];

// Same as useUserProfile, plus: once the user is signed in and has a
// role, send them to that role's page.
export function useRedirectWhenSignedIn() {
  const state = useUserProfile();
  const role = state.profile?.role;
  useEffect(() => {
    if (state.user && role) navigate.to(destinationFor(role));
  }, [state.user, role]);
  return state;
}

export function AuthCard({ title, subtitle, children }) {
  return (
    <main style={s.loginPage}>
      <style>{AUTH_CSS}</style>
      <div style={s.loginCard}>
        <div style={s.authBrand}>
          <span style={s.logo} aria-hidden="true" />
          StudyBuddies
        </div>
        <h1 style={s.title}>{title}</h1>
        {subtitle && <p style={s.subtitle}>{subtitle}</p>}
        {children}
      </div>
    </main>
  );
}

export function TextField({
  id,
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  required = true,
}) {
  return (
    <div style={s.field}>
      <label htmlFor={id} style={s.label}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className="auth-input"
        style={s.input}
      />
    </div>
  );
}

export function GoogleButton({ onClick }) {
  return (
    <button
      type="button"
      className="auth-btn"
      style={s.googleButton}
      onClick={onClick}
    >
      Continue with Google
    </button>
  );
}

export function OrDivider() {
  return (
    <div style={s.divider} aria-hidden="true">
      <span style={s.dividerLine} />
      or
      <span style={s.dividerLine} />
    </div>
  );
}

export function RolePicker({ role, setRole }) {
  return (
    <fieldset style={s.fieldset}>
      <legend style={s.legend}>I am a</legend>
      <div style={s.segmented}>
        {ROLE_OPTIONS.map((r) => (
          <label
            key={r.value}
            className="auth-segment"
            style={
              role === r.value ? { ...s.segment, ...s.segmentOn } : s.segment
            }
          >
            <input
              style={s.srOnly}
              type="radio"
              name="role"
              value={r.value}
              checked={role === r.value}
              onChange={() => setRole(r.value)}
            />
            {r.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// For a signed-in user who has no saved role yet (for example, first
// Google sign-in, or an email sign-up where the instructor code failed).
export function FinishSetup({ initialRole = "student", initialError = "" }) {
  const [role, setRole] = useState(initialRole);
  const [code, setCode] = useState("");
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);
  const { user } = useUserProfile();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await createProfile(user, {
        role,
        displayName: user.displayName || (user.email ?? "").split("@")[0],
        instructorCode: code,
      });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form style={s.form} onSubmit={handleSubmit}>
        <RolePicker role={role} setRole={setRole} />
        {role === "instructor" && (
          <TextField
            id="finish-code"
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
          {busy ? "Saving..." : "Continue"}
        </button>
      </form>
      <p style={s.altLine}>
        <button
          type="button"
          className="auth-link"
          style={s.linkButton}
          onClick={signOutAndGoHome}
        >
          Sign out
        </button>
      </p>
    </>
  );
}
