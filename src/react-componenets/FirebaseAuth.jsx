import { useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";
import { auth } from "./firebase"; // firebase.js must sit in this same folder

// compact = true makes a small version for navbars:
// a "Sign in" button that opens the form in a popup box
export default function FirbaseAuth({ compact = false }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  // Firebase tells us when the user logs in or out
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogle = async () => {
    setError("");
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return compact ? null : <p>Loading...</p>;

  // Logged in view
  if (user) {
    const name = user.displayName || user.email;
    if (compact) {
      return (
        <div style={styles.inline}>
          <span style={styles.name}>{name}</span>
          <button style={styles.smallButton} onClick={() => signOut(auth)}>
            Sign out
          </button>
        </div>
      );
    }
    return (
      <div style={styles.box}>
        <p>Signed in as {name}</p>
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
        <button type="submit" style={styles.primaryButton}>
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
  title: { margin: "0 0 12px" },
  form: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 },
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
