// Domain logic for the instructor's "Meeting times & rules" step and the
// student's "Can you add an hour or two?" request. Pure functions only.
//
// How our class diagram (DCD) maps to the real data:
//
// - GroupMatchingRound -> surveys/{id}. Its label is the survey's `title`.
//   New fields: `offeredWindows` and `deadline`. We say "survey", not "round",
//   because surveys/{id}/rounds/{n} already means one matching attempt.
// - RoundStatus -> survey.status: "open" (still collecting answers) or
//   "closed" (groups proposed). The later steps live on rounds/{n}.status,
//   which the code today sets to "draft" and then "published".
// - TimeWindow -> a slot string like "Mon-17" (Monday 5 PM to 6 PM). See slots.js.
// - MatchingSurvey + Question -> survey.questions[]. In the DCD, prompt = label,
//   answerType = type, optional = !required. `matchOn` says how a rule
//   matches students (for example "same").
// - StudentResponse -> surveys/{id}/responses/{uid}.
//   answers.availability = { available, ifNeeded }
// - AvailabilityRequest -> surveys/{id}/hourRequests/{uid}
// - Server.timeZone -> not stored. The UI shows "Eastern Time (ET)".

import { DAYS, hourLabel, slotId, sortSlots } from "./slots";

// ---------------------------------------------------------------------------
// Presets: the 3 quick-pick buttons on "Meeting times & rules"
// ---------------------------------------------------------------------------

const WEEKDAYS = DAYS.slice(0, 5);
const WEEKEND = DAYS.slice(5);

// Every slot for these days from hour `from` up to but not including `to`.
// The end is left out because a slot is a whole hour that starts at its number:
// "5 PM to 8 PM" is the slots 17, 18 and 19. "Mon-20" would mean 8 PM to 9 PM.
function block(days, from, to) {
  const slots = [];
  for (const day of days) {
    for (let hour = from; hour < to; hour++) {
      slots.push(slotId(day, hour));
    }
  }
  return slots;
}

// Each preset stores a function, not a ready-made list. Every click then gets
// a brand-new array, so code that changes one selection can't change the preset
// that every later click would use.
export const PRESETS = {
  weekdayEvenings: {
    label: "Weekday evenings",
    slots: () => block(WEEKDAYS, 17, 20),
  },
  eveningsWeekends: {
    label: "Evenings + weekends",
    slots: () => [...block(DAYS, 17, 20), ...block(WEEKEND, 10, 17)],
  },
  anyTime: {
    label: "Any time",
    slots: () => block(DAYS, 8, 22),
  },
};

// A preset replaces what's selected, and it comes back in week order.
// Replacing keeps one click predictable: you get exactly what the button says.
// The Set removes any slot two blocks both cover, so no hour is offered twice.
// A wrong name throws, because silently giving back [] would look like
// "no times offered" and hide the typo.
export function applyPreset(name) {
  const preset = PRESETS[name];
  if (!preset) throw new Error(`Unknown preset: ${name}`);
  return sortSlots([...new Set(preset.slots())]);
}

// ---------------------------------------------------------------------------
// The summary line under the instructor's grid
// ---------------------------------------------------------------------------

// Joins hours that follow each other into [start, endNotIncluded] pairs.
// [9, 10, 11, 14] -> [[9, 12], [14, 15]]
function hourRanges(hours) {
  const sorted = [...hours].sort((a, b) => a - b);
  const ranges = [];
  for (const hour of sorted) {
    const last = ranges[ranges.length - 1];
    if (last && last[1] === hour) {
      last[1] = hour + 1;
    } else {
      ranges.push([hour, hour + 1]);
    }
  }
  return ranges;
}

// [17, 20] -> "5–8 PM" (both ends PM, so PM is written once)
// [11, 14] -> "11 AM–2 PM" (AM and PM differ, so both are kept)
function compactRange([from, to]) {
  const start = hourLabel(from);
  const end = hourLabel(to);
  if (start.slice(-3) === end.slice(-3)) return `${start.slice(0, -3)}–${end}`;
  return `${start}–${end}`;
}

// ["Mon", "Tue", "Wed"] -> "Mon–Wed", ["Mon", "Wed"] -> "Mon, Wed", ["Mon"] -> "Mon"
function dayList(days) {
  if (days.length === 1) return days[0];
  const first = DAYS.indexOf(days[0]);
  const inARow = days.every((day, i) => DAYS.indexOf(day) === first + i);
  if (inARow) return `${days[0]}–${days[days.length - 1]}`;
  return days.join(", ");
}

// The line under the grid, e.g. "15 one-hour windows selected · Mon–Fri, 5–8 PM".
// It only prints two ways. When every day has the same hours (which is what the
// presets make) it can say exactly which. Otherwise it just counts the days,
// because a line that lists a different time for each day would be too long to
// read under the grid. Labels come from hourLabel so they match the grid.
export function summarizeWindows(slots) {
  const unique = [...new Set(slots)];
  if (unique.length === 0) return "No windows selected";

  const n = unique.length;
  const head = `${n} one-hour ${n === 1 ? "window" : "windows"} selected`;

  const hoursByDay = {};
  for (const slot of unique) {
    const [day, hour] = slot.split("-");
    if (!DAYS.includes(day)) continue;
    (hoursByDay[day] ??= new Set()).add(Number(hour));
  }

  const days = DAYS.filter((day) => hoursByDay[day]);
  const rangesByDay = days.map((day) => hourRanges(hoursByDay[day]));
  const firstRanges = JSON.stringify(rangesByDay[0]);
  const allSame = days.length > 0 && rangesByDay.every((ranges) => JSON.stringify(ranges) === firstRanges);

  if (allSame) {
    return `${head} · ${dayList(days)}, ${rangesByDay[0].map(compactRange).join(", ")}`;
  }
  return `${head} · ${days.length} days`;
}

// ---------------------------------------------------------------------------
// Matching rules. Each rule is also the question students answer for it.
// ---------------------------------------------------------------------------

// Every survey asks for availability, because without it there is no
// meeting time to match on.
export const AVAILABILITY_QUESTION = {
  id: "availability",
  type: "availability",
  label: "Availability",
  required: true,
};

// Always on and can't be turned off, so it isn't in RULE_TEMPLATES and isn't
// saved. A group that can't meet isn't a group. The matcher already enforces
// it, and this object only exists so the screen can show the rule.
export const SHARED_AVAILABILITY_RULE = {
  id: "shared-availability",
  label: "Shared availability",
  ruleText: "Every group shares at least two of the times above.",
};

// A rule is just on or off: no weights to tune. The id says which way it
// matches, so nobody has to guess whether "gender" means same or mixed.
// Each rule is an ordinary survey question plus matchOn, so turning a rule on
// is the same as adding its question to survey.questions.
export const RULE_TEMPLATES = [
  {
    id: "similarity-challenges",
    type: "multichoice",
    label: "Similar challenges in the course",
    prompt: "Which parts of the course have been hardest for you?",
    options: ["Lectures", "Homework", "Exams", "Projects", "Time management"],
    required: false,
    matchOn: "same",
    ruleText: "Group students who say the same parts of the course have been hardest.",
  },
  {
    id: "similarity-gender",
    type: "gender",
    label: "Gender",
    prompt:
      "Used to group you with students who answered the same, when at least three students share your answer. If fewer than three do, your instructor may be told that a group needs a closer look, but not who or what you answered. Skip it, or pick Prefer not to say, to opt out of both.",
    required: false,
    matchOn: "same",
    ruleText:
      "Group students who give the same answer, when at least three students share it. Groups with a rarer answer are flagged for review. Prefer not to say is never used.",
  },
  {
    id: "similarity-interests",
    type: "interests",
    label: "Interests & About You",
    prompt: "Pick the topics you are interested in.",
    required: false,
    matchOn: "same",
    ruleText: "Group students who picked the same interests.",
  },
];

// Looks a rule up by id, so callers don't depend on its place in the list.
export function ruleTemplate(id) {
  return RULE_TEMPLATES.find((rule) => rule.id === id);
}

// The questions a new survey starts with. It gives back copies, so editing
// a new survey's questions can't change the shared templates above.
// No block list until BlockListStep is more than a placeholder.
export function defaultQuestions() {
  return [AVAILABILITY_QUESTION, ruleTemplate("similarity-challenges"), ruleTemplate("similarity-gender")].map(
    (q) => ({ ...q })
  );
}

// ---------------------------------------------------------------------------
// Review flags for rare gender answers
// ---------------------------------------------------------------------------

// An answer only counts if at least this many students gave it. Otherwise the
// one student with a rare answer never gets matched, or gets put in a group
// where classmates can tell their answer from the group list.
// rareAnswerFlags and byMatchingQuestions both use it, so they always agree.
export const MIN_SHARED_ANSWERS = 3;

// Never matched and never flagged: picking it is how a student opts out.
export const PREFER_NOT_TO_SAY = "Prefer not to say";

const RARE_ANSWER_REASON = "A student's answer to Gender is shared by fewer than three classmates.";

// Flags each group that holds a student whose gender answer fewer than three
// students gave. Matching never uses a rare answer, so the instructor is the
// one who decides if that group needs a closer look.
// The flag names the group only, not the student or the answer, because the
// student prompt promises "not who or what you answered".
// "Prefer not to say" and skipped answers are never counted or flagged,
// because the prompt promises they opt the student out of both.
// One flag per group, so two rare answers don't point at two people.
// Answers are saved by question id, so the gender answer is
// answers["similarity-gender"]. Older surveys used the id "gender", but
// their prompt never mentioned flags, so they are left out on purpose.
export function rareAnswerFlags(groups, students) {
  const genderOf = (s) => s?.answers?.["similarity-gender"];

  const counts = {};
  for (const s of students) {
    const answer = genderOf(s);
    if (s.responded === false || !answer || answer === PREFER_NOT_TO_SAY) continue;
    counts[answer] = (counts[answer] ?? 0) + 1;
  }

  const byUid = {};
  for (const s of students) byUid[s.uid] = s;

  const isRare = (uid) => {
    const answer = genderOf(byUid[uid]);
    return counts[answer] > 0 && counts[answer] < MIN_SHARED_ANSWERS;
  };

  return groups
    .filter((group) => group.memberIds.some(isRare))
    .map((group) => ({ groupId: group.id, reason: RARE_ANSWER_REASON }));
}

// ---------------------------------------------------------------------------
// "Can you add an hour or two?"
// ---------------------------------------------------------------------------
//
// A student here looks like:
//   { uid, responded, availability: ["Mon-17", ...], ifNeeded: ["Tue-18", ...], answers }

// Every slot the student could meet in, whether "available" or "if needed".
function freeSet(s) {
  return new Set([...(s.availability ?? []), ...(s.ifNeeded ?? [])]);
}

// null or undefined -> null, a Set stays the same, an array becomes a Set.
function toSet(slots) {
  if (slots == null) return null;
  if (slots instanceof Set) return slots;
  return new Set(slots);
}

// Suggests up to `max` offered times this student doesn't have yet, where at
// least `minClassmates` other students are free. More classmates first, then
// week order.
// It never gives back counts, so nobody can work out who's free when.
// Students who didn't answer are left out, since they told us nothing.
export function suggestWindowsFor(uid, students, offered, { minClassmates = 3, max = 2 } = {}) {
  const me = students.find((s) => s.uid === uid);
  const mine = me ? freeSet(me) : new Set();
  const others = students.filter((s) => s.uid !== uid && s.responded !== false).map(freeSet);

  let options = toSet(offered);
  if (options === null) {
    options = new Set();
    for (const free of others) for (const slot of free) options.add(slot);
  }

  const candidates = [];
  sortSlots([...options]).forEach((slot, position) => {
    if (mine.has(slot)) return;
    const count = others.filter((free) => free.has(slot)).length;
    candidates.push({ slot, position, count });
  });

  return candidates
    .filter((c) => c.count >= minClassmates)
    .sort((a, b) => b.count - a.count || a.position - b.position)
    .slice(0, max)
    .map((c) => c.slot);
}

// Adds the chosen windows to the student's "if needed" times.
// Suggestions go in "if needed", not "available", because the student only
// agreed to stretch. The matcher still prefers their real times.
// Old responses saved availability as a plain array, so that is still accepted.
// It gives back a new object and never changes the one passed in, because
// React only re-renders when it sees a new object.
export function addIfNeeded(answer, windows) {
  const old = Array.isArray(answer) ? { available: answer, ifNeeded: [] } : answer ?? {};
  const available = [...(old.available ?? [])];
  const ifNeeded = new Set(old.ifNeeded ?? []);
  for (const window of windows) {
    if (!available.includes(window)) ifNeeded.add(window);
  }
  return { available, ifNeeded: sortSlots([...ifNeeded]) };
}

// True while the student can still answer the request: it exists, has no
// reply, and has no closedAt. closedAt gets set when groups are published,
// and after that, new hours can't change anything.
export function isPending(request) {
  return Boolean(request) && !request.reply && !request.closedAt;
}

// ---------------------------------------------------------------------------
// Scoring a student against a group with the survey's rules
// ---------------------------------------------------------------------------

// A student's answer to one question, always as a list.
// Missing or "" -> [], an array stays the same, one value -> [value]
function answerValues(student, q) {
  const value = student.answers?.[q.id];
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) return value;
  return [value];
}

// A matchGroups strategy: (student, members, shared) => score.
// The base score is the shared meeting times, because a group that can't meet
// doesn't work, however much its members have in common.
// Each rule then adds 1 for every usable answer a member shares with the student.
// The answers are counted once here and the function it gives back reuses
// them, because matchGroups calls the score for every student against every
// group. The key joins id and answer with \u0000, a character nobody can type,
// so two different pairs can never make the same key.
export function byMatchingQuestions(questions, students) {
  const rules = (questions ?? []).filter((q) => q.matchOn === "same");

  const counts = new Map();
  for (const s of students) {
    for (const q of rules) {
      for (const v of answerValues(s, q)) {
        const key = `${q.id}\u0000${v}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }

  const usable = (q, v) => v !== PREFER_NOT_TO_SAY && (counts.get(`${q.id}\u0000${v}`) ?? 0) >= MIN_SHARED_ANSWERS;

  return (student, members, shared) => {
    let score = shared.length;
    for (const q of rules) {
      const mine = answerValues(student, q).filter((v) => usable(q, v));
      for (const member of members) {
        const theirs = answerValues(member, q);
        score += mine.filter((v) => theirs.includes(v)).length;
      }
    }
    return score;
  };
}

// Gives back null for surveys with no "same" rules, which includes every
// survey made before this one. matchGroups then uses its old default, so
// old surveys are grouped exactly the way they were promised.
export function strategyFor(survey, students) {
  const hasRules = (survey.questions ?? []).some((q) => q.matchOn === "same");
  return hasRules ? byMatchingQuestions(survey.questions, students) : null;
}
