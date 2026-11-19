import { useState, useEffect, useRef } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  signOut,
} from "firebase/auth";
import { auth } from "./firebase";
import { useUserProfile } from "./useUserProfile";
import { createProfile } from "./accounts";

function friendlyError(err) {
  switch (err.code) {
    case "permission-denied":
      return "The instructor code was not accepted.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Wrong email or password.";
    case "auth/email-already-in-use":
      return "An account with that email already exists.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    default:
      return err.message;
  }
}

function RoleFields({ role, setRole, code, setCode }) {
  return (
    <div style={styles.roleBox}>
      <span style={styles.roleLabel}>I am a:</span>
      <label style={styles.radio}>
        <input
          type="radio"
          name="role"
          checked={role === "student"}
          onChange={() => setRole("student")}
        />{" "}
        Student
      </label>
      <label style={styles.radio}>
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
          style={styles.input}
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
        const cred = await createUserWithEmailAndPassword(auth, email, password);
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
    return <div style={styles.muted}>Loading...</div>;
  }

  if (profileError && compact) {
    return <div style={styles.error}>Auth error</div>;
  }

  // Signed in, but no profile/role saved yet
  if (user && !profile && !loading) {
    const finishForm = (
      <div style={styles.cardContent}>
        <h3 style={styles.title}>Finish setting up</h3>
        <form onSubmit={handleFinish} style={styles.form}>
          <RoleFields role={role} setRole={setRole} code={code} setCode={setCode} />
          <button type="submit" style={styles.primaryButton} disabled={busy}>
            {busy ? "Saving..." : "Continue"}
          </button>
        </form>
        {error && <p style={styles.error}>{error}</p>}
        <button style={styles.link} onClick={() => signOut(auth)}>
          Sign out
        </button>
      </div>
    );

    if (compact) {
      return (
        <div style={styles.wrapper} ref={menuRef}>
          <button
            type="button"
            style={styles.smallButton}
            onClick={() => setOpen(!open)}
            aria-expanded={open}
          >
            Choose role
          </button>
          {open && <div style={styles.popover}>{finishForm}</div>}
        </div>
      );
    }
    return <div style={styles.box}>{finishForm}</div>;
  }

  // Logged in view with a profile
  if (user && profile) {
    const displayName = profile.displayName || user.displayName || user.email || "Account";
    const initials = displayName.charAt(0).toUpperCase();

    if (compact) {
      return (
        <div style={styles.wrapper} ref={menuRef}>
          <button
            type="button"
            style={styles.profileTrigger}
            onClick={() => setOpen(!open)}
            aria-expanded={open}
          >
            <span style={styles.avatar}>{initials}</span>
            <div style={styles.userInfo}>
              <span style={styles.userName}>{displayName}</span>
              <span style={styles.userRole}>{profile.role}</span>
            </div>
          </button>

          {open && (
            <div style={styles.popover}>
              <div style={styles.dropdownHeader}>
                <p style={styles.dropdownName}>{displayName}</p>
                <p style={styles.dropdownEmail}>{user.email}</p>
                <p style={styles.dropdownRole}>Role: {profile.role}</p>
              </div>
              <button
                type="button"
                style={{ ...styles.button, width: "100%" }}
                onClick={() => {
                  setOpen(false);
                  signOut(auth);
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
      <div style={styles.box}>
        <p>
          Signed in as {displayName} <span style={styles.badge}>{profile.role}</span>
        </p>
        <button style={styles.button} onClick={() => signOut(auth)}>
          Sign out
        </button>
      </div>
    );
  }

  // Logged out form content
  const form = (
    <div style={styles.cardContent}>
      <h3 style={styles.title}>{isSignUp ? "Create account" : "Sign in"}</h3>

      <form onSubmit={handleSubmit} style={styles.form}>
        {isSignUp && (
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={styles.input}
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={styles.input}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={styles.input}
        />
        {isSignUp && (
          <RoleFields role={role} setRole={setRole} code={code} setCode={setCode} />
        )}
        <button type="submit" style={styles.primaryButton} disabled={busy}>
          {busy ? "Loading..." : isSignUp ? "Create account" : "Sign in"}
        </button>
      </form>

      <button type="button" style={styles.button} onClick={handleGoogle}>
        Continue with Google
      </button>

      {error && <p style={styles.error}>{error}</p>}

      <p style={styles.switchText}>
        {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
        <button type="button" style={styles.link} onClick={() => setIsSignUp(!isSignUp)}>
          {isSignUp ? "Sign in" : "Create one"}
        </button>
      </p>
    </div>
  );

  if (compact) {
    return (
      <div style={styles.wrapper} ref={menuRef}>
        <button
          type="button"
          style={styles.smallButton}
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          Sign in
        </button>
        {open && <div style={styles.popover}>{form}</div>}
      </div>
    );
  }

  return <div style={styles.box}>{form}</div>;
}

const text = "var(--text, #cdd6f4)";
const base = "var(--base, #1e1e2e)";
const surface = "var(--surface, #313244)";
const surfaceHover = "var(--surface-hover, #45475a)";
const accent = "var(--accent, #cba6f7)";
const muted = "var(--subtext, #a6adc8)";

const styles = {
  box: { maxWidth: 320, margin: "40px auto", color: text },
  wrapper: { position: "relative", width: "100%" },
  popover: {
    position: "absolute",
    left: 0,
    bottom: "calc(100% + 8px)",
    width: "14rem",
    padding: 12,
    background: surface,
    color: text,
    borderRadius: 8,
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
    zIndex: 50,
  },
  cardContent: { display: "flex", flexDirection: "column", gap: 8 },
  profileTrigger: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: 4,
    background: "transparent",
    border: 0,
    borderRadius: 6,
    color: text,
    cursor: "pointer",
    textAlign: "left",
  },
  profileTriggerHover: { background: surfaceHover },
  avatar: {
    display: "grid",
    placeItems: "center",
    flex: "none",
    width: 32,
    height: 32,
    borderRadius: 999,
    background: accent,
    color: base,
    fontSize: 12,
    fontWeight: 700,
  },
  userInfo: { display: "flex", flexDirection: "column", minWidth: 0 },
  userName: { fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  userRole: { fontSize: 11, color: muted, textTransform: "capitalize" },
  dropdownHeader: { paddingBottom: 8, marginBottom: 8, borderBottom: "1px solid var(--border, #45475a)" },
  dropdownName: { margin: 0, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  dropdownEmail: { margin: "2px 0 0", fontSize: 11, color: muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  dropdownRole: { margin: "2px 0 0", fontSize: 11, color: accent, textTransform: "capitalize" },
  inline: { display: "flex", alignItems: "center", gap: 10 },
  badge: {
    fontSize: "0.75rem",
    padding: "1px 8px",
    borderRadius: 999,
    border: "1px solid " + accent,
    color: text,
  },
  title: { margin: "0 0 8px", fontSize: 15 },
  form: { display: "flex", flexDirection: "column", gap: 8 },
  roleBox: { display: "flex", flexDirection: "column", gap: 4 },
  roleLabel: { fontSize: 13 },
  radio: { fontSize: 13, cursor: "pointer" },
  input: {
    padding: 8,
    fontSize: 13,
    background: base,
    color: text,
    border: "1px solid var(--border, #45475a)",
    borderRadius: 6,
  },
  button: {
    padding: 6,
    fontSize: 13,
    cursor: "pointer",
    background: "transparent",
    color: text,
    border: "1px solid " + text,
    borderRadius: 6,
  },
  primaryButton: {
    padding: 8,
    fontSize: 13,
    cursor: "pointer",
    background: accent,
    color: base,
    border: "none",
    borderRadius: 6,
    fontWeight: 600,
  },
  smallButton: {
    padding: "6px 10px",
    fontSize: "0.8125rem",
    width: "100%",
    cursor: "pointer",
    background: "transparent",
    color: text,
    border: "1px solid " + accent,
    borderRadius: 6,
  },
  link: {
    background: "none",
    border: "none",
    color: accent,
    cursor: "pointer",
    padding: 0,
    fontSize: "12px",
    textAlign: "left",
  },
  switchText: { fontSize: 12, margin: "4px 0 0" },
  error: { color: "#f38ba8", fontSize: 12, margin: 0 },
  muted: { fontSize: 12, color: muted },
};
