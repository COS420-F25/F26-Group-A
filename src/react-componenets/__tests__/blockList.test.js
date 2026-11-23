// Tests for the block list helpers ("Edit Matching Exclusion List").
// This was made with the aid of claude
import { blockedUids, confirmationText, filterClassmates, initials, makeEntry } from "../utils/blockList";

const classmates = [
  { uid: "me", name: "Kelvin Ng" },
  { uid: "js", name: "John Smith" },
  { uid: "jd", name: "Jane Doe" },
  { uid: "jo", name: "Johnny Appleseed" },
];

describe("filterClassmates", () => {
  test("matches names case-insensitively and sorts them", () => {
    const result = filterClassmates(classmates, "JOHN", "me", []);
    expect(result.map((c) => c.uid)).toEqual(["js", "jo"]);
  });

  test("never offers yourself", () => {
    expect(filterClassmates(classmates, "kelvin", "me", [])).toEqual([]);
  });

  test("hides classmates already on the list", () => {
    const result = filterClassmates(classmates, "john", "me", ["js"]);
    expect(result.map((c) => c.uid)).toEqual(["jo"]);
  });

  test("returns nothing for empty search text", () => {
    expect(filterClassmates(classmates, "   ", "me", [])).toEqual([]);
  });
});

describe("makeEntry", () => {
  test("builds the stored entry with a trimmed reason and next round", () => {
    const entry = makeEntry({ uid: "js", name: "John Smith" }, "  conflict on a project  ", 2);
    expect(entry).toEqual({
      blockedUid: "js",
      blockedName: "John Smith",
      reason: "conflict on a project",
      appliesFromRound: 2,
    });
  });

  test("allows a missing reason and caps long ones at 500 characters", () => {
    expect(makeEntry({ uid: "js", name: "John Smith" }, undefined, 1).reason).toBe("");
    expect(makeEntry({ uid: "js", name: "John Smith" }, "x".repeat(800), 1).reason).toHaveLength(500);
  });
});

describe("display helpers", () => {
  test("confirmationText names the classmate and the round", () => {
    expect(confirmationText("John Smith", 2)).toBe(
      "Matching will not place you and John Smith together, starting with Round 2. Your current group doesn't change."
    );
  });

  test("initials uses first and last name", () => {
    expect(initials("John Smith")).toBe("JS");
    expect(initials("John Q. Smith")).toBe("JS");
    expect(initials("Cher")).toBe("C");
    expect(initials("")).toBe("?");
  });

  test("blockedUids pulls the uids matching needs", () => {
    expect(blockedUids([{ blockedUid: "js" }, { blockedUid: "jd" }])).toEqual(["js", "jd"]);
  });
});
