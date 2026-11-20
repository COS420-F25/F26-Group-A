import { DAYS, hourLabel, sortSlots } from "./slots";

export const HOUR_REQUEST_MESSAGE = "Can you add an hour or two?";

export const MIN_SHARED_TIMES = 2;
export const DEFAULT_GROUP_SIZE = 4;
export const MAX_GROUP_SIZE = 5;

export function slotLabel(slot) {
  const [day, hour] = slot.split("-");
  return `${day} ${hourLabel(Number(hour))}`;
}

function freeSlots(student) {
  return new Set([...(student.availability ?? []), ...(student.ifNeeded ?? [])]);
}

export function sharedTimes(members) {
  if (members.length === 0) return [];
  const [first, ...rest] = members.map(freeSlots);
  const common = [...first].filter((slot) => rest.every((set) => set.has(slot)));
  return sortSlots(common).map((slot) => ({
    slot,
    ifNeeded: members.some((m) => (m.ifNeeded ?? []).includes(slot) && !(m.availability ?? []).includes(slot)),
  }));
}

export function blockConflict(student, members) {
  return (
    members.find(
      (m) =>
        m.uid !== student.uid &&
        ((student.blockList ?? []).includes(m.uid) || (m.blockList ?? []).includes(student.uid))
    ) ?? null
  );
}

export function blockConflictText(student, other) {
  if ((other.blockList ?? []).includes(student.uid)) {
    return `${other.name} has ${student.name} on their block list.`;
  }
  return `${student.name} has ${other.name} on their block list.`;
}

// A strategy scores how well a student fits a group: (student, members, shared) => number

export const bySchedule = (student, members, shared) => shared.length;

export const byScheduleAndInterests = (student, members, shared) => {
  const mine = new Set(student.tags ?? []);
  const sharedTags = members.reduce(
    (count, m) => count + (m.tags ?? []).filter((t) => mine.has(t)).length,
    0
  );
  return shared.length + sharedTags * 0.25;
};

export const STRATEGIES = { bySchedule, byScheduleAndInterests };

// Students with the fewest free times are hardest to place, so they go first.
function hardestFirst(a, b) {
  const diff = freeSlots(a).size - freeSlots(b).size;
  return diff !== 0 ? diff : (a.name ?? "").localeCompare(b.name ?? "");
}

export function matchGroups(
  students,
  { groupSize = DEFAULT_GROUP_SIZE, minShared = MIN_SHARED_TIMES, strategy = bySchedule } = {}
) {
  const responded = students.filter((s) => s.responded !== false).sort(hardestFirst);
  const unplaced = students
    .filter((s) => s.responded === false)
    .map((s) => ({ uid: s.uid, reason: "noResponse" }));

  const buckets = [];
  for (const student of responded) {
    const best = bestBucket(student, buckets, { maxSize: groupSize, minShared, strategy });
    if (best !== null) buckets[best].push(student);
    else buckets.push([student]);
  }

  const alone = buckets.filter((members) => members.length === 1).map((members) => members[0]);
  const kept = buckets.filter((members) => members.length > 1);
  for (const student of alone) {
    const best = bestBucket(student, kept, { maxSize: MAX_GROUP_SIZE, minShared, strategy });
    if (best !== null) kept[best].push(student);
    else unplaced.push({ uid: student.uid, reason: "noOverlap" });
  }

  const groups = kept.map((members, i) => ({
    id: `g${i + 1}`,
    name: `Group ${i + 1}`,
    memberIds: [...members].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")).map((m) => m.uid),
    reviewed: false,
  }));

  return { groups, unplaced };
}

function bestBucket(student, buckets, { maxSize, minShared, strategy }) {
  let best = null;
  buckets.forEach((members, index) => {
    if (members.length >= maxSize) return;
    if (blockConflict(student, members)) return;
    const shared = sharedTimes([...members, student]);
    if (shared.length < minShared) return;
    const option = { index, score: strategy(student, members, shared), size: members.length };
    if (!best || isBetter(option, best)) best = option;
  });
  return best ? best.index : null;
}

function isBetter(a, b) {
  if (a.score !== b.score) return a.score > b.score;
  if (a.size !== b.size) return a.size < b.size;
  return a.index < b.index;
}

// Each option's status is "ok", "belowRule" (allowed, but under the 2-time rule) or "conflict" (block list, can't move)
export function previewMove(student, groups, studentsById, { minShared = MIN_SHARED_TIMES } = {}) {
  const options = groups
    .filter((g) => !g.memberIds.includes(student.uid))
    .map((g) => {
      const members = g.memberIds.map((id) => studentsById[id]).filter(Boolean);
      const conflictWith = blockConflict(student, members);
      const shared = sharedTimes([...members, student]);
      const sharedBefore = members.length > 0 ? sharedTimes(members).length : null;
      let status = "ok";
      if (conflictWith) status = "conflict";
      else if (shared.length < minShared) status = "belowRule";
      return {
        groupId: g.id,
        name: g.name,
        status,
        shared,
        sharedBefore,
        sizeAfter: members.length + 1,
        overMax: members.length + 1 > MAX_GROUP_SIZE,
        conflictWith,
        bestFit: false,
      };
    });

  const ok = options.filter((o) => o.status === "ok");
  const roomy = ok.filter((o) => !o.overMax);
  const allowed = roomy.length > 0 ? roomy : ok;
  if (allowed.length > 0) {
    const most = Math.max(...allowed.map((o) => o.shared.length));
    const best = allowed.find((o) => o.shared.length === most);
    best.bestFit = true;
  }

  const rank = (o) => (o.bestFit ? 0 : o.status === "ok" ? 1 : o.status === "belowRule" ? 2 : 3);
  return options.sort((a, b) => rank(a) - rank(b));
}

// Pass toGroupId null to take the student out of their group.
export function moveStudent(groups, uid, toGroupId) {
  return groups.map((g) => {
    let memberIds = g.memberIds.filter((id) => id !== uid);
    if (g.id === toGroupId) memberIds = [...memberIds, uid];
    const changed = memberIds.length !== g.memberIds.length || memberIds.some((id, i) => id !== g.memberIds[i]);
    return changed ? { ...g, memberIds, reviewed: false } : g;
  });
}

export function nextGroup(groups) {
  let n = groups.length + 1;
  while (groups.some((g) => g.id === `g${n}`)) n += 1;
  return { id: `g${n}`, name: `Group ${n}`, memberIds: [], reviewed: false };
}

export function unplacedReason(student) {
  if (student.responded === false) {
    return "Didn't fill out the survey, so no meeting times are known.";
  }
  const slots = [...freeSlots(student)];
  if (slots.length === 0) return "Didn't mark any free times.";
  const days = [...new Set(slots.map((s) => s.split("-")[0]))].sort(
    (a, b) => DAYS.indexOf(a) - DAYS.indexOf(b)
  );
  if (days.length === 1) {
    return `Free only on ${FULL_DAY[days[0]]}s. No group shares that time.`;
  }
  return `No group shares ${MIN_SHARED_TIMES} of their free times.`;
}

const FULL_DAY = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

export function reconcileRound(round, students) {
  const known = new Set(students.map((s) => s.uid));
  const groups = round.groups.map((g) => ({ ...g, memberIds: g.memberIds.filter((id) => known.has(id)) }));
  const unplaced = round.unplaced.filter((u) => known.has(u.uid));
  const seen = new Set([
    ...groups.flatMap((g) => g.memberIds),
    ...unplaced.map((u) => u.uid),
    ...(round.removed ?? []),
  ]);
  const missing = students
    .filter((s) => !seen.has(s.uid))
    .map((s) => ({ uid: s.uid, reason: s.responded === false ? "noResponse" : "noOverlap" }));
  return { ...round, groups, unplaced: [...unplaced, ...missing] };
}

export function roundSummary(round, totalStudents) {
  const placed = round.groups.reduce((n, g) => n + g.memberIds.length, 0);
  return {
    placed,
    total: totalStudents,
    needGroup: round.unplaced.length,
    reviewed: round.groups.filter((g) => g.reviewed).length,
    groupCount: round.groups.length,
  };
}

function answerFor(survey, response, type) {
  const question = (survey.questions ?? []).find((q) => q.type === type);
  return question ? response.answers?.[question.id] : undefined;
}

export function readAvailability(survey, response) {
  const answer = answerFor(survey, response, "availability");
  // Older answers save availability as a plain list.
  if (Array.isArray(answer)) return { available: answer, ifNeeded: [] };
  return { available: answer?.available ?? [], ifNeeded: answer?.ifNeeded ?? [] };
}

export function studentsFromSurvey(survey, roster, responses) {
  const targets = survey.targetStudentUids?.length ? new Set(survey.targetStudentUids) : null;
  const byUid = new Map();

  for (const person of roster) {
    if (targets && !targets.has(person.uid)) continue;
    byUid.set(person.uid, {
      uid: person.uid,
      name: person.name || person.email || "Student",
      responded: false,
      availability: [],
      ifNeeded: [],
      tags: [],
      blockList: [],
    });
  }

  for (const response of responses) {
    if (targets && !targets.has(response.uid)) continue;
    const base = byUid.get(response.uid);
    const { available, ifNeeded } = readAvailability(survey, response);
    const interests = answerFor(survey, response, "interests");
    const blockList = answerFor(survey, response, "blocklist");
    byUid.set(response.uid, {
      uid: response.uid,
      name: base?.name && base.name !== "Student" ? base.name : response.name || response.email || "Student",
      responded: true,
      availability: available,
      ifNeeded,
      tags: Array.isArray(interests) ? interests : [],
      blockList: Array.isArray(blockList) ? blockList : [],
      updatedAt: response.updatedAt ?? null,
    });
  }

  return [...byUid.values()].sort((a, b) => a.name.localeCompare(b.name));
}
