import { matchSurveyResponses } from "@groups/groupMatching.js";

test("groups four students who share two weekly slots", () => {
  const survey = { questions: [{ id: "weekly-schedule", type: "availability" }] };
  const responses = ["ava", "ben", "cam", "dev", "eli", "fin"].map((uid) => {
    const available = uid === "eli" ? ["Tue-18", "Tue-19"] : ["Wed-18", "Mon-18"];
    return { uid, answers: { "weekly-schedule": { available: uid === "fin" ? [] : available } } };
  });

  expect(matchSurveyResponses(survey, responses)).toEqual({
    groups: [{
      memberUids: ["ava", "ben", "cam", "dev"],
      availableSlots: ["Mon-18", "Wed-18"],
    }],
    unplaced: [
      { uid: "eli", reason: "no-compatible-placement-found" },
      { uid: "fin", reason: "no-usable-availability" },
    ],
  });
});
