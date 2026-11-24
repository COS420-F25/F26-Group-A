import { signOut } from "firebase/auth";
import { auth } from "@authent/firebase";
import { navigate } from "@utils/navigate.js";

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
