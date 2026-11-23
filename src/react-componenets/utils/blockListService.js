// Facade over Firestore for the block list feature.
// Every function resolves to { ok: true, data } or { ok: false, error } and never rejects,
// so callers check `result.ok` instead of catching.
// Claude Opus 5.5 was used as part of generate and edit for this file.
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { filterClassmates } from "./blockList";

const success = (data) => ({ ok: true, data });
const failure = (err) => ({ ok: false, error: err?.message ?? "Something went wrong." });

function settle(promise, toData) {
  return promise.then((value) => success(toData(value)), failure);
}

export function watchBlockList(uid, onData, onError) {
  return onSnapshot(
    collection(db, "users", uid, "blockList"),
    (snap) => {
      const entries = snap.docs.map((d) => d.data());
      entries.sort((a, b) => (a.blockedName ?? "").localeCompare(b.blockedName ?? ""));
      onData(entries);
    },
    (err) => onError(failure(err).error)
  );
}

export function addBlock(uid, entry) {
  if (!entry?.blockedUid || entry.blockedUid === uid) {
    return Promise.resolve({ ok: false, error: "You can't add yourself to your block list." });
  }
  const ref = doc(db, "users", uid, "blockList", entry.blockedUid);
  return settle(setDoc(ref, { ...entry, addedAt: serverTimestamp() }), () => entry.blockedUid);
}

export function removeBlock(uid, blockedUid) {
  return settle(deleteDoc(doc(db, "users", uid, "blockList", blockedUid)), () => blockedUid);
}

export function searchClassmates(query, selfUid, blockedUids) {
  return settle(getDocs(collection(db, "directory")), (snap) =>
    filterClassmates(
      snap.docs.map((d) => ({ uid: d.id, name: d.data().name ?? "" })),
      query,
      selfUid,
      blockedUids
    )
  );
}
