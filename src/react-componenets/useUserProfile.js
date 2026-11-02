import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";

// Gives a component the signed-in user and their saved profile.
//   user     the Firebase user, or null when signed out
//   profile  the users/{uid} data (has .role), or null if no role is saved yet
//   role     "student", "instructor", or null
//   loading  true until we know both
//   error    set if the profile could not be read
export function useUserProfile() {
  const [state, setState] = useState({
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let stopProfile = () => {};

    const stopAuth = onAuthStateChanged(auth, (user) => {
      stopProfile();

      if (!user) {
        setState({ user: null, profile: null, loading: false, error: null });
        return;
      }

      setState({ user, profile: null, loading: true, error: null });

      // Listening live means the screen updates right after the role is saved
      stopProfile = onSnapshot(
        doc(db, "users", user.uid),
        (snap) => {
          setState({
            user,
            profile: snap.exists() ? snap.data() : null,
            loading: false,
            error: null,
          });
        },
        (error) => {
          console.error(error);
          setState({ user, profile: null, loading: false, error });
        }
      );
    });

    return () => {
      stopAuth();
      stopProfile();
    };
  }, []);

  return { ...state, role: state.profile?.role ?? null };
}
