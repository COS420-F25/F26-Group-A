// Turns a Firebase error into a message a person can act on.
export function friendlyError(err) {
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
