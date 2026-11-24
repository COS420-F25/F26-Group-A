import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { getStudents } from "./surveyService";
import { HOUR_REQUEST_MESSAGE } from "./groupRounds";


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

// Block list
// Stored at courses/{courseId}/blockLists/{uid}/entries/{blockedUid}.
// These never reject: a failed read gives [], a failed write is logged and resolves.

const blockEntries = (db, courseId, uid) => collection(db, "courses", courseId, "blockLists", uid, "entries");

const logFailure = (action) => (err) => {
  console.error(`Block list ${action} failed:`, err?.message ?? err);
};

export async function getBlockList(courseId, uid) {
  const db = await database();
  return getDocs(blockEntries(db, courseId, uid)).then(
    (snap) =>
      snap.docs
        .map((d) => d.data())
        .sort((a, b) => (a.blockedName ?? "").localeCompare(b.blockedName ?? "")),
    (err) => {
      logFailure("read")(err);
      return [];
    }
  );
}

export async function addBlock(courseId, uid, entry) {
  if (!entry?.blockedUid || entry.blockedUid === uid) {
    logFailure("add")({ message: "You can't add yourself to your block list." });
    return;
  }
  const db = await database();
  await setDoc(doc(blockEntries(db, courseId, uid), entry.blockedUid), {
    blockedUid: entry.blockedUid,
    blockedName: entry.blockedName,
    reason: (entry.reason ?? "").trim().slice(0, 500),
    createdAt: serverTimestamp(),
    addedDuringRound: entry.addedDuringRound,
    effectiveFromRound: entry.effectiveFromRound,
  }).then(() => undefined, logFailure("add"));
}

export async function removeBlock(courseId, uid, blockedUid) {
  const db = await database();
  await deleteDoc(doc(blockEntries(db, courseId, uid), blockedUid)).then(() => undefined, logFailure("remove"));
}

export const firebaseGroupService = {
  getSurvey,
  getStudents,
  getResponses,
  getLatestRound,
  saveRound,
  publishRound,
  askForHours,
  getBlockList,
  addBlock,
  removeBlock,
};
