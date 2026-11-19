import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import { navigate } from "./navigate.js";

// Signs out, then sends the person to the home page, which offers
// Sign up and Sign in again.
export async function signOutAndGoHome() {
  try {
    await signOut(auth);
  } catch (err) {
    console.error(err);
  }
  navigate.to("/");
}
