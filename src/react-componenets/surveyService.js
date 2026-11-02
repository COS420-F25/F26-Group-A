import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { sortSlots } from "./slots";

// Where things are stored:
//   surveys/{surveyId}                    the survey an instructor sent
//   surveys/{surveyId}/responses/{uid}    one answer per student (sending again replaces it)

export const DEFAULT_TAGS = [
  "Math",
  "Programming",
  "Science",
  "Writing",
  "Engineering",
  "Business",
  "Design",
  "Languages",
];

// ---------- Instructor side ----------

// Sends a new survey. Students see it right away.
export async function sendSurvey(user, { title, description, tags, startHour, endHour }) {
  const ref = await addDoc(collection(db, "surveys"), {
    title: title.trim(),
    description: description.trim(),
    tags,
    startHour,
    endHour,
    status: "open",
    createdBy: user.uid,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// status is "open" or "closed". Students can only answer open surveys.
export function setSurveyStatus(surveyId, status) {
  return updateDoc(doc(db, "surveys", surveyId), { status });
}

export async function getResponses(surveyId) {
  const snap = await getDocs(collection(db, "surveys", surveyId, "responses"));
  return snap.docs
    .map((d) => d.data())
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
}

// ---------- Student side ----------

export async function getMyResponse(surveyId, uid) {
  const snap = await getDoc(doc(db, "surveys", surveyId, "responses", uid));
  return snap.exists() ? snap.data() : null;
}

// availability: list of slots like "Mon-09". tags: list of interest names.
export function saveResponse(surveyId, user, profile, { availability, tags }) {
  return setDoc(doc(db, "surveys", surveyId, "responses", user.uid), {
    uid: user.uid,
    name: profile.displayName || user.email || "",
    email: user.email || profile.email || "",
    availability: sortSlots(availability),
    tags,
    updatedAt: serverTimestamp(),
  });
}

// ---------- Live lists ----------

// Newest first. A survey that is still saving has no time yet, so it goes on top.
const seconds = (survey) => survey.createdAt?.seconds ?? Number.MAX_SAFE_INTEGER;

function watch(q, onData, onError) {
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => seconds(b) - seconds(a));
      onData(list);
    },
    onError
  );
}

// Surveys students can answer. Returns a function that stops listening.
export function watchOpenSurveys(onData, onError) {
  return watch(query(collection(db, "surveys"), where("status", "==", "open")), onData, onError);
}

// Surveys one instructor sent, open or closed.
export function watchMySurveys(uid, onData, onError) {
  return watch(query(collection(db, "surveys"), where("createdBy", "==", uid)), onData, onError);
}
