import { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  signOut,
} from "firebase/auth";
import { auth } from "./firebase"; // firebase.js must sit in this same folder
import { useUserProfile } from "./useUserProfile";
import { createProfile } from "./accounts";

// Turns Firebase error codes into short messages
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

// Student / Instructor choice. Instructors also type the instructor code.
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

// compact = true makes a small version for navbars:
// a "Sign in" button that opens the form in a popup box
export default function FirbaseAuth({ compact = false }) {
  // user = Firebase login, profile = the saved role (null until one is chosen)
  const { user, profile, loading } = useUserProfile();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [code, setCode] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  // Open the popup when the user still needs to pick a role. Close it once they have.
  useEffect(() => {
    setOpen(Boolean(user && !profile && !loading));
  }, [user, profile, loading]);

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
      // If the instructor code was wrong, the account exists but has no role yet.
      // The "finish setup" form below lets them try again.
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

  // For people who signed in but have no role saved (Google sign-in, older accounts)
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

  // Right after sign up, the role is still being saved
  const savingRole = busy && user && !profile;

  if (loading || savingRole) return compact ? null : <p>Loading...</p>;

  // Signed in, but no role saved yet
  if (user && !profile) {
    const finishForm = (
      <>
        <h3 style={styles.title}>Finish setting up</h3>
        <form onSubmit={handleFinish} style={styles.form}>
          <RoleFields role={role} setRole={setRole} code={code} setCode={setCode} />
          <button type="submit" style={styles.primaryButton}>
            Continue
          </button>
        </form>
        {error && <p style={styles.error}>{error}</p>}
        <p style={styles.switchText}>
          <button style={styles.link} onClick={() => signOut(auth)}>
            Sign out
          </button>
        </p>
      </>
    );

    if (compact) {
      return (
        <div style={styles.wrapper}>
          <button
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

  // Logged in view
  if (user) {
    const name = profile.displayName || user.displayName || user.email;
    if (compact) {
      return (
        <div style={styles.inline}>
          <span style={styles.name}>{name}</span>
          <span style={styles.badge}>{profile.role}</span>
          <button style={styles.smallButton} onClick={() => signOut(auth)}>
            Sign out
          </button>
        </div>
      );
    }
    return (
      <div style={styles.box}>
        <p>
          Signed in as {name} <span style={styles.badge}>{profile.role}</span>
        </p>
        <button style={styles.button} onClick={() => signOut(auth)}>
          Sign out
        </button>
      </div>
    );
  }

  // The login form, used by both views
  const form = (
    <>
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
          {isSignUp ? "Create account" : "Sign in"}
        </button>
      </form>

      <button style={styles.button} onClick={handleGoogle}>
        Continue with Google
      </button>

      {error && <p style={styles.error}>{error}</p>}

      <p style={styles.switchText}>
        {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
        <button style={styles.link} onClick={() => setIsSignUp(!isSignUp)}>
          {isSignUp ? "Sign in" : "Create one"}
        </button>
      </p>
    </>
  );

  // Logged out, navbar version
  if (compact) {
    return (
      <div style={styles.wrapper}>
        <button
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

  // Logged out, full version
  return <div style={styles.box}>{form}</div>;
}

// Colors use your site's CSS variables when they exist,
// and fall back to Catppuccin Mocha when they don't
const text = "var(--text, #cdd6f4)";
const base = "var(--base, #1e1e2e)";
const surface = "var(--surface, #313244)";
const accent = "var(--accent, #cba6f7)";

const styles = {
  box: { maxWidth: 320, margin: "40px auto", color: text },
  wrapper: { position: "relative" },
  popover: {
    position: "absolute",
    right: 0,
    top: "calc(100% + 8px)",
    width: "min(300px, 90vw)",
    padding: 16,
    background: surface,
    color: text,
    borderRadius: 8,
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
    zIndex: 10,
  },
  inline: { display: "flex", alignItems: "center", gap: 10 },
  name: { color: text, fontSize: "0.875rem" },
  badge: {
    fontSize: "0.75rem",
    padding: "1px 8px",
    borderRadius: 999,
    border: "1px solid " + accent,
    color: text,
  },
  title: { margin: "0 0 12px" },
  form: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 },
  roleBox: { display: "flex", flexDirection: "column", gap: 6 },
  roleLabel: { fontSize: 14 },
  radio: { fontSize: 14, cursor: "pointer" },
  input: {
    padding: 8,
    fontSize: 14,
    background: base,
    color: text,
    border: "1px solid transparent",
    borderRadius: 6,
  },
  button: {
    padding: 8,
    fontSize: 14,
    width: "100%",
    cursor: "pointer",
    background: "transparent",
    color: text,
    border: "1px solid " + text,
    borderRadius: 6,
  },
  primaryButton: {
    padding: 8,
    fontSize: 14,
    cursor: "pointer",
    background: accent,
    color: base,
    border: "none",
    borderRadius: 6,
    fontWeight: 600,
  },
  smallButton: {
    padding: "4px 12px",
    fontSize: "0.875rem",
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
    fontSize: "inherit",
  },
  switchText: { fontSize: 14, margin: "12px 0 0" },
  error: { color: "#f38ba8", fontSize: 13 },
};
