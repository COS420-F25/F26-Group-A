import { sortSlots } from "./slots.js";

export function matchSurveyResponses(survey, responses) {
  const question = survey.questions?.find((item) => item.type === "availability");
  const students = responses.map(({ uid, answers }) => {
  const answer = answers?.[question?.id];

    return { uid, available: answer?.available ?? (Array.isArray(answer) ? answer : []) };
  
  });

  const members = [];
  let sharedSlots = [];
  for (const student of students) {
    
    const common = members.length
      ? sharedSlots.filter((slot) => student.available.includes(slot))
      : [...new Set(student.available)];
    
    if (common.length < 2) continue;
    
    members.push(student.uid);
    
    sharedSlots = common;
    if (members.length === 4) break;
  }

  const placed = members.length >= 3 ? members : [];
  const groups = placed.length ? [{ memberUids: placed, availableSlots: sortSlots(sharedSlots) }] : [];
  const unplaced = students
    .filter(({ uid }) => !placed.includes(uid))
    .map(({ uid, available }) => ({
      uid,
      reason: available.length ? "no-compatible-placement-found" : "no-usable-availability",
    }));
  return { groups, unplaced };
}
