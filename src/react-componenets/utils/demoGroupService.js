const student = (uid, name) => ({ uid, name, email: `${uid}@example.edu` });

const ROSTER = [
  student("john-doe", "John Doe"),
  student("jane-doe", "Jane Doe"),
  student("john-smith", "John Smith"),
  student("jane-smith", "Jane Smith"),
  student("john-roe", "John Roe"),
  student("jane-roe", "Jane Roe"),
  student("john-public", "John Public"),
  student("sam-park", "Sam Park"),
  student("mary-major", "Mary Major"),
  student("max-mustermann", "Max Mustermann"),
  student("erika-mustermann", "Erika Mustermann"),
  student("joe-bloggs", "Joe Bloggs"),
  student("tom-brown", "Tom Brown"),
  student("richard-roe", "Richard Roe"),
  student("fred-bloggs", "Fred Bloggs"),
  student("alice-smith", "Alice Smith"),
  student("jack-doe", "Jack Doe"),
  student("joan-bloggs", "Joan Bloggs"),
  student("kim-lee", "Kim Lee"),
];

const GROUP_1 = ["Mon-18", "Wed-18", "Thu-19"];
const GROUP_2 = ["Mon-18", "Wed-18", "Fri-17"];
const GROUP_3 = ["Tue-17", "Thu-17", "Mon-19"];
const GROUP_4 = ["Tue-18", "Wed-19", "Thu-18"];

const QUESTIONS = [
  { id: "interests", type: "interests", label: "Interests & About You", required: true },
  { id: "availability", type: "availability", label: "Availability", required: true },
  { id: "blocklist", type: "blocklist", label: "Block list", required: false },
];

const answer = (uid, available, { ifNeeded = [], tags = ["Programming"], blockList = [], updatedAt } = {}) => ({
  uid,
  name: ROSTER.find((s) => s.uid === uid).name,
  email: `${uid}@example.edu`,
  answers: {
    interests: tags,
    availability: { available, ifNeeded },
    blocklist: blockList,
  },
  updatedAt: updatedAt ?? "2026-11-10T12:00:00Z",
});

const RESPONSES = [
  answer("john-doe", GROUP_1, { tags: ["Math"] }),
  answer("jane-doe", GROUP_1, { blockList: ["john-public"], tags: ["Math", "Writing"] }),
  answer("john-smith", ["Mon-18", "Wed-18"], { ifNeeded: ["Thu-19"] }),
  answer("jane-smith", GROUP_1),
  answer("john-roe", GROUP_2),
  answer("jane-roe", GROUP_2, { tags: ["Design"] }),
  answer("john-public", ["Mon-18", "Wed-18", "Fri-17", "Tue-17", "Thu-17", "Thu-18"]),
  answer("sam-park", GROUP_2),
  answer("mary-major", GROUP_3, { tags: ["Science"] }),
  answer("max-mustermann", ["Tue-17", "Thu-17"], { ifNeeded: ["Mon-19"] }),
  answer("erika-mustermann", GROUP_3),
  answer("joe-bloggs", GROUP_3),
  answer("tom-brown", GROUP_4, { tags: ["Engineering"] }),
  answer("richard-roe", GROUP_4),
  answer("fred-bloggs", GROUP_4),
  answer("alice-smith", GROUP_4),
  answer("jack-doe", ["Sun-10"], { ifNeeded: ["Tue-17", "Thu-17"], updatedAt: "2026-11-15T18:00:00Z" }),
  answer("joan-bloggs", ["Sat-10", "Sat-11", "Sat-12"]),
];

const DRAFT = {
  roundNumber: 1,
  status: "draft",
  groups: [
    { id: "g1", name: "Group 1", memberIds: ["john-doe", "jane-doe", "john-smith", "jane-smith"], reviewed: true },
    { id: "g2", name: "Group 2", memberIds: ["john-roe", "jane-roe", "john-public", "sam-park"], reviewed: false },
    {
      id: "g3",
      name: "Group 3",
      memberIds: ["mary-major", "max-mustermann", "erika-mustermann", "joe-bloggs"],
      reviewed: false,
    },
    { id: "g4", name: "Group 4", memberIds: ["tom-brown", "richard-roe", "fred-bloggs", "alice-smith"], reviewed: false },
  ],
  unplaced: [
    { uid: "jack-doe", reason: "noOverlap", askedAt: "2026-11-14T15:00:00Z" },
    { uid: "joan-bloggs", reason: "noOverlap" },
    { uid: "kim-lee", reason: "noResponse" },
  ],
  removed: [],
  lastChange: "",
};

const copy = (value) => JSON.parse(JSON.stringify(value));

export function createDemoGroupService() {
  const survey = {
    id: "demo",
    title: "Week 1 reflection groups",
    status: "closed",
    questions: QUESTIONS,
    targetStudentUids: [],
    startHour: 8,
    endHour: 22,
  };
  let saved = copy(DRAFT);

  return {
    getSurvey: async () => ({ ...survey }),
    getStudents: async () => copy(ROSTER),
    getResponses: async () => copy(RESPONSES),
    getLatestRound: async () => copy(saved),
    saveRound: async (surveyId, user, round) => {
      saved = copy(round);
    },
    publishRound: async (surveyId, user, round) => {
      saved = { ...copy(round), status: "published" };
    },
    askForHours: async () => {},
  };
}
