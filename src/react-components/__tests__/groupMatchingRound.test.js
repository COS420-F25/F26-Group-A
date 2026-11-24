import {
  PRESETS,
  applyPreset,
  summarizeWindows,
  RULE_TEMPLATES,
  AVAILABILITY_QUESTION,
  defaultQuestions,
  suggestWindowsFor,
  addIfNeeded,
  isPending,
  byMatchingQuestions,
  strategyFor,
  rareAnswerFlags,
} from "../utils/groupMatchingRound";

// A fake class member, in the same shape the module's functions take
const student = (uid, availability = [], ifNeeded = [], extra = {}) => ({
  uid,
  name: uid,
  responded: true,
  availability,
  ifNeeded,
  ...extra,
});

describe("applyPreset", () => {
  test("weekdayEvenings is 5 PM to 8 PM, Monday to Friday", () => {
    const slots = applyPreset("weekdayEvenings");
    expect(slots).toHaveLength(15);
    expect(slots).toContain("Mon-17");
    expect(slots).toContain("Fri-19");
    expect(slots).not.toContain("Mon-20");
    expect(slots).not.toContain("Sat-17");
  });

  test("eveningsWeekends adds weekend daytimes to every evening", () => {
    const slots = applyPreset("eveningsWeekends");
    expect(slots).toHaveLength(35);
    expect(slots).toContain("Sun-19");
    expect(slots).toContain("Sat-10");
    expect(slots).toContain("Sat-16");
    expect(slots).not.toContain("Mon-10");
  });

  test("anyTime is 8 AM to 10 PM every day", () => {
    expect(applyPreset("anyTime")).toHaveLength(98);
  });

  test("comes back in week order", () => {
    expect(applyPreset("weekdayEvenings").slice(0, 4)).toEqual(["Mon-17", "Mon-18", "Mon-19", "Tue-17"]);
  });

  test("each preset has the label shown on its button", () => {
    expect(PRESETS.weekdayEvenings.label).toBe("Weekday evenings");
    expect(PRESETS.eveningsWeekends.label).toBe("Evenings + weekends");
    expect(PRESETS.anyTime.label).toBe("Any time");
  });

  test("a wrong preset name throws", () => {
    expect(() => applyPreset("lunch")).toThrow(/unknown preset/i);
  });
});

describe("summarizeWindows", () => {
  test("a preset prints its days and hours", () => {
    expect(summarizeWindows(applyPreset("weekdayEvenings"))).toBe(
      "15 one-hour windows selected · Mon–Fri, 5–8 PM"
    );
  });

  test("days with different hours are only counted", () => {
    expect(summarizeWindows(["Mon-17", "Mon-18", "Tue-17", "Wed-09", "Thu-17"])).toBe(
      "5 one-hour windows selected · 4 days"
    );
  });

  test("one window is singular", () => {
    expect(summarizeWindows(["Wed-14"])).toBe("1 one-hour window selected · Wed, 2–3 PM");
  });

  test("a range across noon keeps both AM and PM", () => {
    expect(summarizeWindows(["Mon-11", "Mon-12", "Mon-13"])).toBe(
      "3 one-hour windows selected · Mon, 11 AM–2 PM"
    );
  });

  test("days not in a row are listed with commas", () => {
    expect(summarizeWindows(["Mon-17", "Wed-17", "Fri-17"])).toBe(
      "3 one-hour windows selected · Mon, Wed, Fri, 5–6 PM"
    );
  });

  test("nothing selected", () => {
    expect(summarizeWindows([])).toBe("No windows selected");
  });
});

describe("RULE_TEMPLATES", () => {
  const byId = (id) => RULE_TEMPLATES.find((rule) => rule.id === id);

  test("there are 3 rules and each matches on the same answer", () => {
    expect(RULE_TEMPLATES.map((rule) => rule.id).sort()).toEqual([
      "similarity-challenges",
      "similarity-gender",
      "similarity-interests",
    ]);
    expect(RULE_TEMPLATES.every((rule) => rule.matchOn === "same")).toBe(true);
  });

  test("gender is optional and tells students how it is used", () => {
    const gender = byId("similarity-gender");
    expect(gender.type).toBe("gender");
    expect(gender.required).toBe(false);
    expect(gender.prompt).toMatch(/group you with students who answered the same/i);
    expect(gender.prompt).toMatch(/prefer not to say/i);
    expect(gender.ruleText).toMatch(/at least three students/i);
  });

  test("challenges is a multichoice question with 5 options", () => {
    const challenges = byId("similarity-challenges");
    expect(challenges.type).toBe("multichoice");
    expect(challenges.options).toEqual(["Lectures", "Homework", "Exams", "Projects", "Time management"]);
  });

  test("defaultQuestions starts with availability and has no block list", () => {
    const questions = defaultQuestions();
    expect(questions.map((q) => q.id)).toEqual(["availability", "similarity-challenges", "similarity-gender"]);
    expect(questions.some((q) => q.type === "blocklist")).toBe(false);
  });
});

describe("rareAnswerFlags", () => {
  const group = (id, memberIds) => ({ id, name: id, memberIds });
  const withGender = (uid, gender) => student(uid, [], [], { answers: { "similarity-gender": gender } });

  test("a group with a gender answer fewer than 3 students gave is flagged", () => {
    const students = [
      withGender("ana", "Non-binary"),
      withGender("bo", "Non-binary"),
      withGender("cy", "Woman"),
      withGender("di", "Woman"),
      withGender("ed", "Woman"),
    ];
    const flags = rareAnswerFlags([group("g1", ["ana", "cy"]), group("g2", ["di", "ed"])], students);
    expect(flags).toEqual([{ groupId: "g1", reason: expect.stringMatching(/fewer than three/i) }]);
    expect(flags[0].reason).not.toMatch(/ana|non-binary/i);
  });

  test("an answer 3 students share is not flagged", () => {
    const students = ["ana", "bo", "cy"].map((uid) => withGender(uid, "Man"));
    expect(rareAnswerFlags([group("g1", ["ana", "bo", "cy"])], students)).toEqual([]);
  });

  test("Prefer not to say and skipped answers are never flagged", () => {
    const students = [
      withGender("ana", "Prefer not to say"),
      student("bo"),
      withGender("cy", "Woman"),
      withGender("di", "Woman"),
      withGender("ed", "Woman"),
    ];
    expect(rareAnswerFlags([group("g1", ["ana", "bo", "cy"])], students)).toEqual([]);
  });

  test("a group with two rare answers gets one flag", () => {
    const students = [
      withGender("ana", "Non-binary"),
      withGender("bo", "Man"),
    ];
    expect(rareAnswerFlags([group("g1", ["ana", "bo"])], students)).toHaveLength(1);
  });
});

describe("suggestWindowsFor", () => {
  const offered = new Set(["Mon-17", "Mon-18", "Tue-17", "Wed-18"]);
  const me = student("me", ["Mon-17"]);

  test("2 classmates free is not enough", () => {
    const students = [me, student("a", ["Tue-17"]), student("b", ["Tue-17"])];
    expect(suggestWindowsFor("me", students, offered)).toEqual([]);
  });

  test("3 classmates free is enough, and if-needed times count", () => {
    const students = [me, student("a", ["Tue-17"]), student("b", ["Tue-17"]), student("c", [], ["Tue-17"])];
    expect(suggestWindowsFor("me", students, offered)).toEqual(["Tue-17"]);
  });

  test("a time I already have is not suggested", () => {
    const students = [me, student("a", ["Mon-17"]), student("b", ["Mon-17"]), student("c", ["Mon-17"])];
    expect(suggestWindowsFor("me", students, offered)).toEqual([]);
  });

  test("a time that wasn't offered is not suggested", () => {
    const students = [me, student("a", ["Fri-17"]), student("b", ["Fri-17"]), student("c", ["Fri-17"])];
    expect(suggestWindowsFor("me", students, offered)).toEqual([]);
  });

  test("most classmates first, then week order, at most 2", () => {
    const three = ["Tue-17", "Wed-18", "Mon-18"];
    const students = [me, student("a", three), student("b", three), student("c", three), student("d", ["Wed-18"])];
    expect(suggestWindowsFor("me", students, offered)).toEqual(["Wed-18", "Mon-18"]);
  });
});

describe("addIfNeeded", () => {
  test("accepts the old array format", () => {
    expect(addIfNeeded(["Mon-17"], ["Tue-18"])).toEqual({ available: ["Mon-17"], ifNeeded: ["Tue-18"] });
  });

  test("a missing answer starts from empty lists", () => {
    expect(addIfNeeded(undefined, ["Tue-18"])).toEqual({ available: [], ifNeeded: ["Tue-18"] });
  });

  test("no duplicates, and available times stay where they are", () => {
    const result = addIfNeeded({ available: ["Mon-17"], ifNeeded: ["Tue-18"] }, ["Mon-17", "Tue-18", "Wed-18"]);
    expect(result.available).toEqual(["Mon-17"]);
    expect(result.ifNeeded).toEqual(["Tue-18", "Wed-18"]);
  });

  test("the answer passed in doesn't change", () => {
    const answer = { available: ["Mon-17"], ifNeeded: ["Tue-18"] };
    const result = addIfNeeded(answer, ["Wed-18"]);
    expect(answer).toEqual({ available: ["Mon-17"], ifNeeded: ["Tue-18"] });
    expect(result).not.toBe(answer);
  });
});

describe("isPending", () => {
  test("a request with no reply is pending", () => {
    expect(isPending({ askedAt: 1 })).toBe(true);
  });

  test("a replied, closed, or missing request is not pending", () => {
    expect(isPending({ askedAt: 1, reply: "added" })).toBe(false);
    expect(isPending({ askedAt: 1, closedAt: 2 })).toBe(false);
    expect(isPending(null)).toBe(false);
  });
});

describe("byMatchingQuestions", () => {
  const gender = { id: "similarity-gender", type: "gender", matchOn: "same" };
  const challenges = { id: "similarity-challenges", type: "multichoice", matchOn: "same" };
  const withAnswers = (uid, answers) => student(uid, [], [], { answers });

  test("a shared answer adds 1 for each member who has it", () => {
    const [a, b, c, d] = [
      withAnswers("a", { "similarity-gender": "Woman" }),
      withAnswers("b", { "similarity-gender": "Woman" }),
      withAnswers("c", { "similarity-gender": "Woman" }),
      withAnswers("d", { "similarity-gender": "Man" }),
    ];
    const score = byMatchingQuestions([gender], [a, b, c, d]);
    expect(score(a, [b, c], [])).toBe(2);
    expect(score(a, [d], [])).toBe(0);
  });

  test("an answer fewer than 3 students gave is never used", () => {
    const [a, b, c, d, e] = [
      withAnswers("a", { "similarity-gender": "Non-binary" }),
      withAnswers("b", { "similarity-gender": "Non-binary" }),
      withAnswers("c", { "similarity-gender": "Woman" }),
      withAnswers("d", { "similarity-gender": "Woman" }),
      withAnswers("e", { "similarity-gender": "Woman" }),
    ];
    const score = byMatchingQuestions([gender], [a, b, c, d, e]);
    expect(score(a, [b], [])).toBe(0);
    expect(score(c, [d, e], [])).toBe(2);
  });

  test("Prefer not to say never matches", () => {
    const students = ["p", "q", "r", "s"].map((uid) => withAnswers(uid, { "similarity-gender": "Prefer not to say" }));
    const score = byMatchingQuestions([gender], students);
    expect(score(students[0], students.slice(1), [])).toBe(0);
  });

  test("each usable pick in a multichoice answer counts", () => {
    const [a, b, c, d] = [
      withAnswers("a", { "similarity-challenges": ["Exams", "Homework", "Projects"] }),
      withAnswers("b", { "similarity-challenges": ["Exams", "Homework", "Projects"] }),
      withAnswers("c", { "similarity-challenges": ["Exams"] }),
      withAnswers("d", { "similarity-challenges": ["Homework"] }),
    ];
    const score = byMatchingQuestions([challenges], [a, b, c, d]);
    expect(score(a, [b], [])).toBe(2); // only 2 picked Projects, so it doesn't count
    expect(score(a, [c], [])).toBe(1);
  });

  test("questions without matchOn are ignored and the base is the shared times", () => {
    const plain = { id: "interests", type: "interests" };
    const [a, b, c] = ["a", "b", "c"].map((uid) => withAnswers(uid, { interests: ["Programming"] }));
    const score = byMatchingQuestions([plain], [a, b, c]);
    expect(score(a, [b, c], ["Mon-17", "Mon-18", "Tue-17"])).toBe(3);
  });
});

describe("strategyFor", () => {
  test("a survey with no matching rules uses the old default", () => {
    expect(strategyFor({ questions: [AVAILABILITY_QUESTION] }, [])).toBeNull();
  });

  test("a survey with the gender rule scores shared answers", () => {
    const gender = { id: "similarity-gender", type: "gender", matchOn: "same" };
    const people = ["p0", "p1", "p2"].map((uid) => student(uid, [], [], { answers: { "similarity-gender": "Man" } }));
    const score = strategyFor({ questions: [AVAILABILITY_QUESTION, gender] }, people);
    expect(score(people[0], [people[1], people[2]], [])).toBe(2);
  });
});
