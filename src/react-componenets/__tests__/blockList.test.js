// Tests for the block list methods on GroupService ("Edit Matching Exclusion List").
// Claude Opus 5.5 was used as part of generate for this file.
import { deleteDoc, getDocs, setDoc } from "firebase/firestore";
import { addBlock, firebaseGroupService, getBlockList, removeBlock } from "../utils/groupService";

jest.mock("firebase/firestore", () => ({
  collection: jest.fn((db, ...path) => ({ path: path.join("/") })),
  doc: jest.fn((parent, ...path) => ({ path: [parent.path, ...path].join("/") })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  deleteDoc: jest.fn(),
  writeBatch: jest.fn(),
  serverTimestamp: jest.fn(() => "mock-timestamp"),
}));

jest.mock("../firebase", () => ({ db: {} }), { virtual: true });
jest.mock("../utils/surveyService", () => ({ getStudents: jest.fn() }));

const entry = {
  blockedUid: "js",
  blockedName: "John Smith",
  reason: "  conflict on a project  ",
  addedDuringRound: 1,
  effectiveFromRound: 2,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

test("addBlock saves the entry under the course and student", async () => {
  setDoc.mockResolvedValue();
  await addBlock("cos420", "me", entry);

  expect(setDoc).toHaveBeenCalledWith(
    { path: "courses/cos420/blockLists/me/entries/js" },
    {
      blockedUid: "js",
      blockedName: "John Smith",
      reason: "conflict on a project",
      createdAt: "mock-timestamp",
      addedDuringRound: 1,
      effectiveFromRound: 2,
    }
  );
});

test("addBlock caps the reason at 500 characters", async () => {
  setDoc.mockResolvedValue();
  await addBlock("cos420", "me", { ...entry, reason: "x".repeat(800) });

  expect(setDoc.mock.calls[0][1].reason).toHaveLength(500);
});

test("addBlock refuses to block yourself without calling Firestore", async () => {
  await addBlock("cos420", "me", { ...entry, blockedUid: "me" });

  expect(setDoc).not.toHaveBeenCalled();
});

test("addBlock resolves instead of rejecting when Firestore fails", async () => {
  setDoc.mockRejectedValue({ message: "permission-denied" });

  await expect(addBlock("cos420", "me", entry)).resolves.toBeUndefined();
  expect(console.error).toHaveBeenCalled();
});

test("removeBlock deletes the entry", async () => {
  deleteDoc.mockResolvedValue();
  await removeBlock("cos420", "me", "js");

  expect(deleteDoc).toHaveBeenCalledWith({ path: "courses/cos420/blockLists/me/entries/js" });
});

test("getBlockList returns entries sorted by name", async () => {
  getDocs.mockResolvedValue({
    docs: [
      { data: () => ({ blockedUid: "jd", blockedName: "Jane Doe" }) },
      { data: () => ({ blockedUid: "aa", blockedName: "Abe Adams" }) },
    ],
  });

  const list = await getBlockList("cos420", "me");
  expect(list.map((e) => e.blockedUid)).toEqual(["aa", "jd"]);
});

test("getBlockList returns an empty list when Firestore fails", async () => {
  getDocs.mockRejectedValue({ message: "permission-denied" });

  await expect(getBlockList("cos420", "me")).resolves.toEqual([]);
});

test("firebaseGroupService exposes the block list methods", () => {
  expect(firebaseGroupService.getBlockList).toBe(getBlockList);
  expect(firebaseGroupService.addBlock).toBe(addBlock);
  expect(firebaseGroupService.removeBlock).toBe(removeBlock);
});
