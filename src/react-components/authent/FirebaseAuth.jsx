import { useState, useEffect, useRef } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
} from "firebase/auth";
import { auth } from "@authent/firebase";
import { useUserProfile } from "@authent/useUserProfile";
import { createProfile } from "@authent/accounts";

import { friendlyError } from "@authent/authErrors.js";
import { signOutAndGoHome } from "@authent/signOutAndGoHome.js";

function RoleFields({ role, setRole, code, setCode }) {
  return (
    <div className="sv-role-box">
      <span className="sv-role-label">I am a:</span>
      <label className="sv-radio">
        <input
          type="radio"
          name="role"
          checked={role === "student"}
          onChange={() => setRole("student")}
        />{" "}
        Student
      </label>
      <label className="sv-radio">
        <input
          type="radio"
          name="role"
          checked={role === "instructor"}
          onChange={() => setRole("instructor")}
        />{" "}
        Instructor
      </label>
      {role === "instructor" && (
        <input
          type="password"
          placeholder="Instructor code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          className="sv-input sv-input-sm"
        />
      )}
    </div>
  );
}

export default function FirbaseAuth({ compact = false }) {
  const { user, profile, loading, error: profileError } = useUserProfile();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [code, setCode] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (isSignUp) {
        const cred = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        await updateProfile(cred.user, { displayName: name.trim() });
        await createProfile(cred.user, {
          role,
          displayName: name.trim(),
          instructorCode: code,
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      setError(friendlyError(err));
    }
  };

  const handleFinish = async (e) => {
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
  };

  if (loading && compact) {
    return <div className="sv-muted sv-small">Loading...</div>;
  }

  if (profileError && compact) {
    return <div className="sv-error">Auth error</div>;
  }

  // Signed in, but no profile/role saved yet
  if (user && !profile && !loading) {
    const finishForm = (
      <div className="sv-stack">
        <h3 className="sv-auth-title">Finish setting up</h3>
        <form onSubmit={handleFinish} className="sv-auth-form">
          <RoleFields
            role={role}
            setRole={setRole}
            code={code}
            setCode={setCode}
          />
          <button
            type="submit"
            className="sv-btn sv-btn-primary sv-btn-sm"
            disabled={busy}
          >
            {busy ? "Saving..." : "Continue"}
          </button>
        </form>
        {error && <p className="sv-error">{error}</p>}
        <button type="button" className="sv-link" onClick={signOutAndGoHome}>
          Sign out
        </button>
      </div>
    );

    if (compact) {
      return (
        <div className="sv-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="sv-btn sv-btn-outline sv-btn-sm sv-btn-block"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
          >
            Choose role
          </button>
          {open && <div className="sv-popover">{finishForm}</div>}
        </div>
      );
    }
    return <div className="sv-auth-box">{finishForm}</div>;
  }

  // Logged in view with a profile
  if (user && profile) {
    const displayName =
      profile.displayName || user.displayName || user.email || "Account";
    const initials = displayName.charAt(0).toUpperCase();

    if (compact) {
      return (
        <div className="sv-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="sv-profile-btn"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
          >
            <span className="sv-avatar">{initials}</span>
            <div className="sv-user-info">
              <span className="sv-side-name">{displayName}</span>
              <span className="sv-side-role">{profile.role}</span>
            </div>
          </button>

          {open && (
            <div className="sv-popover">
              <div className="sv-menu-head">
                <p className="sv-menu-name">{displayName}</p>
                <p className="sv-menu-email">{user.email}</p>
                <p className="sv-menu-role">Role: {profile.role}</p>
              </div>
              <button
                type="button"
                className="sv-btn sv-btn-sm sv-btn-block"
                onClick={() => {
                  setOpen(false);
                  signOutAndGoHome();
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="sv-auth-box">
        <p>
          Signed in as {displayName}{" "}
          <span className="sv-badge">{profile.role}</span>
        </p>
        <button
          type="button"
          className="sv-btn sv-btn-sm sv-btn-block"
          onClick={signOutAndGoHome}
        >
          Sign out
        </button>
      </div>
    );
  }

  // Logged out form content
  const form = (
    <div className="sv-stack">
      <h3 className="sv-auth-title">
        {isSignUp ? "Create account" : "Sign in"}
      </h3>

      <form onSubmit={handleSubmit} className="sv-auth-form">
        {isSignUp && (
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="sv-input sv-input-sm"
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="sv-input sv-input-sm"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="sv-input sv-input-sm"
        />
        {isSignUp && (
          <RoleFields
            role={role}
            setRole={setRole}
            code={code}
            setCode={setCode}
          />
        )}
        <button
          type="submit"
          className="sv-btn sv-btn-primary sv-btn-sm"
          disabled={busy}
        >
          {busy ? "Loading..." : isSignUp ? "Create account" : "Sign in"}
        </button>
      </form>

      <button
        type="button"
        className="sv-btn sv-btn-sm sv-btn-block"
        onClick={handleGoogle}
      >
        Continue with Google
      </button>

      {error && <p className="sv-error">{error}</p>}

      <p className="sv-hint" style={{ margin: 0 }}>
        {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
        <button
          type="button"
          className="sv-link"
          onClick={() => setIsSignUp(!isSignUp)}
        >
          {isSignUp ? "Sign in" : "Create one"}
        </button>
      </p>
    </div>
  );

  // Sidebar corner: send people to the full sign-up / sign-in pages
  if (compact) {
    return (
      <div className="sv-auth-links">
        <a
          href="/signup"
          className="sv-btn sv-btn-primary sv-btn-sm sv-btn-block"
        >
          Sign up
        </a>
        <a
          href="/signin"
          className="sv-btn sv-btn-outline sv-btn-sm sv-btn-block"
        >
          Sign in
        </a>
      </div>
    );
  }

  return <div className="sv-auth-box">{form}</div>;
}
