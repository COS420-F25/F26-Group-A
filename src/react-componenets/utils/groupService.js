import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { getStudents } from "./surveyService";
import { HOUR_REQUEST_MESSAGE } from "./groupRounds";

// Firebase is loaded on first use, so files that import this one can be tested without Firebase keys.
const database = async () => (await import("../firebase")).db;

export async function getSurvey(surveyId) {
  const db = await database();
  const snap = await getDoc(doc(db, "surveys", surveyId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getResponses(surveyId) {
  const db = await database();
  const snap = await getDocs(collection(db, "surveys", surveyId, "responses"));
  return snap.docs.map((d) => d.data());
}

export async function getLatestRound(surveyId) {
  const db = await database();
  const snap = await getDocs(collection(db, "surveys", surveyId, "rounds"));
  const rounds = snap.docs.map((d) => d.data());
  if (rounds.length === 0) return null;
  return rounds.sort((a, b) => b.roundNumber - a.roundNumber)[0];
}

export async function saveRound(surveyId, user, round) {
  const db = await database();
  return setDoc(doc(db, "surveys", surveyId, "rounds", `round-${round.roundNumber}`), {
    roundNumber: round.roundNumber,
    status: round.status,
    groups: round.groups,
    unplaced: round.unplaced,
    removed: round.removed ?? [],
    lastChange: round.lastChange ?? "",
    updatedBy: user.uid,
    updatedAt: serverTimestamp(),
  });
}

export async function publishRound(surveyId, user, round) {
  const db = await database();
  const batch = writeBatch(db);
  for (const group of round.groups) {
    if (group.memberIds.length === 0) continue;
    batch.set(doc(db, "surveys", surveyId, "groups", `r${round.roundNumber}-${group.id}`), {
      roundNumber: round.roundNumber,
      name: group.name,
      memberIds: group.memberIds,
      publishedBy: user.uid,
      publishedAt: serverTimestamp(),
    });
  }
  batch.set(
    doc(db, "surveys", surveyId, "rounds", `round-${round.roundNumber}`),
    { status: "published", publishedAt: serverTimestamp() },
    { merge: true }
  );
  await batch.commit();
}

export async function askForHours(surveyId, uid) {
  const db = await database();
  return setDoc(doc(db, "surveys", surveyId, "hourRequests", uid), {
    uid,
    message: HOUR_REQUEST_MESSAGE,
    askedAt: serverTimestamp(),
  });
}

export const firebaseGroupService = {
  getSurvey,
  getStudents,
  getResponses,
  getLatestRound,
  saveRound,
  publishRound,
  askForHours,
};
