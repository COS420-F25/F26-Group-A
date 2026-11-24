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
import { db } from "@authent/firebase";
import { sortSlots } from "@utils/slots";

export const DEFAULT_QUESTIONS = [
  {
    id: "interests",
    type: "interests",
    label: "Interests & About You",
    required: true,
  },
  { id: "gender", type: "gender", label: "Gender", required: false },
  {
    id: "availability",
    type: "availability",
    label: "Availability",
    required: true,
  },
  { id: "blocklist", type: "blocklist", label: "Block list", required: false },
];

export async function sendSurvey(
  user,
  { title, description, questions, targetStudentUids, startHour, endHour },
) {
  const ref = await addDoc(collection(db, "surveys"), {
    title: title.trim(),
    description: description.trim(),
    questions,
    targetStudentUids: targetStudentUids ?? [],
    startHour,
    endHour,
    status: "open",
    createdBy: user.uid,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export function setSurveyStatus(surveyId, status) {
  return updateDoc(doc(db, "surveys", surveyId), { status });
}

export function watchResponses(surveyId, onData, onError) {
  return onSnapshot(
    collection(db, "surveys", surveyId, "responses"),
    (snap) => {
      const list = snap.docs.map((d) => d.data());
      list.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
      onData(list);
    },
    onError,
  );
}

export async function getStudents() {
  const snap = await getDocs(
    query(collection(db, "users"), where("role", "==", "student")),
  );
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        name: data.displayName || data.email || "",
        email: data.email || "",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getMyResponse(surveyId, uid) {
  const snap = await getDoc(doc(db, "surveys", surveyId, "responses", uid));
  return snap.exists() ? snap.data() : null;
}

export function saveResponse(surveyId, user, profile, answers) {
  return setDoc(doc(db, "surveys", surveyId, "responses", user.uid), {
    uid: user.uid,
    name: profile.displayName || user.email || "",
    email: user.email || profile.email || "",
    answers,
    updatedAt: serverTimestamp(),
  });
}

const seconds = (survey) =>
  survey.createdAt?.seconds ?? Number.MAX_SAFE_INTEGER;

function watch(q, onData, onError) {
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => seconds(b) - seconds(a));
      onData(list);
    },
    onError,
  );
}

export function watchOpenSurveys(onData, onError) {
  return watch(
    query(collection(db, "surveys"), where("status", "==", "open")),
    onData,
    onError,
  );
}

export function watchMySurveys(uid, onData, onError) {
  return watch(
    query(collection(db, "surveys"), where("createdBy", "==", uid)),
    onData,
    onError,
  );
}
