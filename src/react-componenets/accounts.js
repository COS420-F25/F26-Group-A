import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export const ROLES = ["student", "instructor"];

// Saves the role for a signed-in user at users/{uid}.
// Instructors must send the instructor code. Firestore checks it
// against config/instructor, so it cannot be skipped in the browser.
// A role cannot be changed after it is saved.
export async function createProfile(user, { role, displayName, instructorCode = "" }) {
  const data = {
    email: user.email ?? "",
    displayName: displayName ?? "",
    role,
    createdAt: serverTimestamp(),
  };
  if (role === "instructor") data.instructorCode = instructorCode.trim();
  await setDoc(doc(db, "users", user.uid), data);
}
