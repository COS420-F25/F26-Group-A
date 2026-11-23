// Tests for the block list Firestore facade.
// Claude Opus 5.5 was used as part of generate for this file.
import { deleteDoc, getDocs, setDoc } from "firebase/firestore";
import { addBlock, removeBlock, searchClassmates } from "../utils/blockListService";

jest.mock("firebase/firestore", () => ({
  collection: jest.fn((db, ...path) => ({ path: path.join("/") })),
  doc: jest.fn((db, ...path) => ({ path: path.join("/") })),
  setDoc: jest.fn(),
  deleteDoc: jest.fn(),
  getDocs: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(() => "mock-timestamp"),
}));

jest.mock("../firebase", () => ({ db: {} }), { virtual: true });

const entry = { blockedUid: "js", blockedName: "John Smith", reason: "", appliesFromRound: 2 };

beforeEach(() => {
  jest.clearAllMocks();
});

test("addBlock saves the entry under the student's own block list", async () => {
  setDoc.mockResolvedValue();
  const result = await addBlock("me", entry);

  expect(result).toEqual({ ok: true, data: "js" });
  expect(setDoc).toHaveBeenCalledWith(
    { path: "users/me/blockList/js" },
    { ...entry, addedAt: "mock-timestamp" }
  );
});

test("addBlock refuses to block yourself without calling Firestore", async () => {
  const result = await addBlock("me", { ...entry, blockedUid: "me" });

  expect(result.ok).toBe(false);
  expect(setDoc).not.toHaveBeenCalled();
});

test("addBlock reports a Firestore failure instead of rejecting", async () => {
  setDoc.mockRejectedValue({ message: "permission-denied" });
  const result = await addBlock("me", entry);

  expect(result).toEqual({ ok: false, error: "permission-denied" });
});

test("removeBlock deletes the entry", async () => {
  deleteDoc.mockResolvedValue();
  const result = await removeBlock("me", "js");

  expect(result).toEqual({ ok: true, data: "js" });
  expect(deleteDoc).toHaveBeenCalledWith({ path: "users/me/blockList/js" });
});

test("searchClassmates reads the directory and filters it", async () => {
  getDocs.mockResolvedValue({
    docs: [
      { id: "me", data: () => ({ name: "Kelvin Ng" }) },
      { id: "js", data: () => ({ name: "John Smith" }) },
      { id: "jd", data: () => ({ name: "Jane Doe" }) },
    ],
  });
  const result = await searchClassmates("j", "me", ["jd"]);

  expect(result).toEqual({ ok: true, data: [{ uid: "js", name: "John Smith" }] });
});
