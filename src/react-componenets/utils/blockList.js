// Pure helpers for the block list feature ("Edit Matching Exclusion List" use case).
// Claude Opus 5.5 was used as part of generate and edit for this file.

// Classmates matching the search text, without yourself or anyone already blocked.
export function filterClassmates(classmates, query, selfUid, blockedUids) {
  const text = (query ?? "").trim().toLowerCase();
  if (text === "") return [];
  const blocked = new Set(blockedUids ?? []);
  return (classmates ?? [])
    .filter((c) => c.uid !== selfUid && !blocked.has(c.uid))
    .filter((c) => (c.name ?? "").toLowerCase().includes(text))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// The green line shown before the student confirms.
export function confirmationText(name, nextRound) {
  return `Matching will not place you and ${name} together, starting with Round ${nextRound}. Your current group doesn't change.`;
}

// "John Smith" -> "JS"
export function initials(name) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// The uids matching uses, taken from the stored entries.
export function blockedUids(entries) {
  return (entries ?? []).map((e) => e.blockedUid);
}

// Builds the entry saved to users/{uid}/blockList/{blockedUid}.
export function makeEntry(classmate, reason, nextRound) {
  return {
    blockedUid: classmate.uid,
    blockedName: classmate.name,
    reason: (reason ?? "").trim().slice(0, 500),
    appliesFromRound: nextRound,
  };
}
