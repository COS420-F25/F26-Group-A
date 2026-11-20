import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  blockConflictText,
  getPublishWarnings,
  HOUR_REQUEST_MESSAGE,
  MAX_GROUP_SIZE,
  MIN_SHARED_TIMES,
  matchGroups,
  previewMove,
  reconcileRound,
  roundSummary,
  sharedTimes,
  slotLabel,
  STRATEGIES,
  unplacedReason,
  studentsFromSurvey,
} from "../utils/groupRounds";
import { initialState, roundReducer } from "../utils/groupRoundReducer";
import PublishGroupDialog from "../PublishGroupDialog";
import Breadcrumb from "../structure/Breadcrumb";
import { Page } from "../structure/AppShell";

const LIFECYCLE = ["Set up", "Collect responses", "Match", "Review", "Publish"];

export default function ReviewGroups({ user, surveyId, service, strategy = "byScheduleAndInterests" }) {
  const { getSurvey, getStudents, getResponses, getLatestRound, saveRound, publishRound, askForHours } = service;
  const [state, dispatch] = useReducer(roundReducer, initialState);
  const [students, setStudents] = useState(null); // null while loading
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [menuFor, setMenuFor] = useState(null); // uid of the student whose Move menu is open
  const needsSave = useRef(false);

  const round = state.round;
  const matchOptions = { strategy: STRATEGIES[strategy] ?? STRATEGIES.bySchedule };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [surveyDoc, roster, responses, saved] = await Promise.all([
          getSurvey(surveyId),
          getStudents(),
          getResponses(surveyId),
          getLatestRound(surveyId),
        ]);
        if (cancelled) return;
        if (!surveyDoc) return setLoadError("This survey could not be found.");

        const list = studentsFromSurvey(surveyDoc, roster, responses);
        setStudents(list);

        if (saved && saved.status !== "published") {
          dispatch({ type: "load", round: reconcileRound(saved, list) });
        } else {
          const { groups, unplaced } = matchGroups(list, matchOptions);
          dispatch({
            type: "load",
            round: {
              roundNumber: saved ? saved.roundNumber + 1 : 1,
              status: "draft",
              groups,
              unplaced,
              removed: [],
              lastChange: "",
            },
          });
          needsSave.current = true;
        }
      } catch (err) {
        if (!cancelled) setLoadError("Could not load this survey: " + err.message);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyId]);

  useEffect(() => {
    if (!round || !needsSave.current) return;
    needsSave.current = false;
    setSaving(true);
    saveRound(surveyId, user, round)
      .catch((err) => setError("Could not save your changes: " + err.message))
      .finally(() => setSaving(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, surveyId, user]);

  const byId = useMemo(
    () => Object.fromEntries((students ?? []).map((s) => [s.uid, s])),
    [students]
  );

  if (loadError) {
    return (
      <Page>
        <p className="sv-error" role="alert">
          {loadError}
        </p>
      </Page>
    );
  }
  if (!round || !students) {
    return (
      <Page>
        <p className="sv-hint">Loading groups...</p>
      </Page>
    );
  }

  const published = round.status === "published";
  const groupsToPublish = round.groups.filter((group) => group.memberIds.length > 0);
  const publishChecks = showPublishDialog ? getPublishWarnings(groupsToPublish, byId) : null;

  function change(action) {
    needsSave.current = true;
    setNotice("");
    setError("");
    setMenuFor(null);
    dispatch(action);
  }

  function rematch() {
    const active = students.filter((s) => !(round.removed ?? []).includes(s.uid));
    const { groups, unplaced } = matchGroups(active, matchOptions);
    change({ type: "rematch", groups, unplaced });
  }

  async function handleAsk(uid) {
    setMenuFor(null);
    setError("");
    try {
      await askForHours(surveyId, uid);
      needsSave.current = true;
      dispatch({ type: "askedForHours", uid, askedAt: new Date().toISOString() });
      setNotice(`Asked ${byId[uid]?.name ?? "the student"} to add hours.`);
    } catch (err) {
      setError("Could not send the request: " + err.message);
    }
  }

  async function handlePublish() {
    setError("");
    setPublishing(true);
    try {
      await publishRound(surveyId, user, round);
      dispatch({ type: "published" });
      setShowPublishDialog(false);
      const left = round.unplaced.length;
      setNotice(
        "Groups published. Each student can now see their own group." +
          (left > 0 ? ` ${left} ${left === 1 ? "student still needs" : "students still need"} a group.` : "")
      );
    } catch (err) {
      setError("Could not publish: " + err.message);
    } finally {
      setPublishing(false);
    }
  }

  const summary = roundSummary(round, students.length - (round.removed ?? []).length);
  const menuProps = (student) => ({
    student,
    options: previewMove(student, round.groups, byId),
    onMove: (groupId) => change({ type: "move", uid: student.uid, toGroupId: groupId, name: student.name }),
    onAsk: () => handleAsk(student.uid),
    onRemove: () => change({ type: "remove", uid: student.uid, name: student.name }),
    onClose: () => setMenuFor(null),
  });

  return (
    <Page>
      <Breadcrumb steps={LIFECYCLE} current={published ? 4 : 3} label="Survey progress" />
      <h1 className="sv-title">Review proposed groups &middot; Round {round.roundNumber}</h1>

      <SummaryBar
        summary={summary}
        lastChange={round.lastChange}
        canUndo={state.history.length > 0 && !published}
        onUndo={() => change({ type: "undo" })}
      />

      <div className="sv-toolbar" style={{ marginTop: 16 }}>
        <div style={s.row}>
          <button className="sv-btn sv-btn-sm" onClick={rematch} disabled={published}>
            Run matching again
          </button>
          <button className="sv-btn sv-btn-sm" onClick={() => change({ type: "addGroup" })} disabled={published}>
            + Add group
          </button>
        </div>
        <button
          className="sv-btn sv-btn-primary"
          onClick={() => {
            setError("");
            setMenuFor(null);
            setShowPublishDialog(true);
          }}
          disabled={published || saving || publishing || groupsToPublish.length === 0}
        >
          {published ? "Published" : publishing ? "Publishing..." : "Continue to publish"}
        </button>
      </div>

      {error && !showPublishDialog && (
        <p className="sv-error" role="alert">
          {error}
        </p>
      )}
      {notice && <p className="sv-success">{notice}</p>}
      {saving && <p className="sv-hint">Saving...</p>}

      <div style={s.grid}>
        {round.groups.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            members={group.memberIds.map((id) => byId[id]).filter(Boolean)}
            locked={published}
            menuFor={menuFor}
            onOpenMenu={setMenuFor}
            menuProps={menuProps}
            onToggleReviewed={() => change({ type: "toggleReviewed", groupId: group.id })}
          />
        ))}

        {round.unplaced.length > 0 && (
          <NeedsGroupPanel
            unplaced={round.unplaced}
            byId={byId}
            groups={round.groups}
            locked={published}
            menuFor={menuFor}
            onOpenMenu={setMenuFor}
            menuProps={menuProps}
            onPlace={(student, groupId) =>
              change({ type: "move", uid: student.uid, toGroupId: groupId, name: student.name })
            }
          />
        )}
      </div>
      {publishChecks && (
        <PublishGroupDialog
          review={{
            roundNumber: round.roundNumber,
            studentCount: summary.placed,
            groupCount: groupsToPublish.length,
            instructorName: user.displayName ?? "",
            courseName: "",
            warnings: publishChecks.warnings,
            preview: null,
          }}
          blockers={publishChecks.blockers}
          onClose={() => setShowPublishDialog(false)}
          onConfirm={handlePublish}
          publishing={publishing}
          error={error}
        />
      )}
    </Page>
  );
}

function SummaryBar({ summary, lastChange, canUndo, onUndo }) {
  const { placed, total, needGroup, reviewed, groupCount } = summary;
  return (
    <div style={s.summary} role="status">
      <span>
        <strong>{placed} of {total}</strong> students placed
      </span>
      {needGroup > 0 && (
        <span style={{ color: s.warn }}>
          {needGroup} {needGroup === 1 ? "student needs" : "students need"} a group
        </span>
      )}
      <span>
        <strong>{reviewed} of {groupCount}</strong> groups reviewed
      </span>
      <span style={{ ...s.row, gap: 6 }}>
        <TimeChip time={{ slot: "Mon-18", ifNeeded: false }} label="Time" /> everyone free
        <TimeChip time={{ slot: "Mon-18", ifNeeded: true }} label="Time" /> someone marked &ldquo;if needed&rdquo;
      </span>
      {lastChange && (
        <span style={{ marginLeft: "auto", color: color.subtext }}>
          Last change: {lastChange}
          {canUndo && (
            <button style={s.link} onClick={onUndo}>
              Undo
            </button>
          )}
        </span>
      )}
    </div>
  );
}

function GroupCard({ group, members, locked, menuFor, onOpenMenu, menuProps, onToggleReviewed }) {
  const shared = sharedTimes(members);
  const belowRule = members.length > 1 && shared.length < MIN_SHARED_TIMES;

  return (
    <section style={s.card} aria-label={group.name}>
      <div style={{ ...s.spread, alignItems: "center", marginBottom: 8 }}>
        <h2 style={{ ...s.subheading, margin: 0 }}>{group.name}</h2>
        {group.reviewed ? (
          <button style={s.reviewedBadge} onClick={onToggleReviewed} disabled={locked} title="Click to unmark">
            ✓ Reviewed
          </button>
        ) : (
          <button style={s.link} onClick={onToggleReviewed} disabled={locked}>
            Mark reviewed
          </button>
        )}
      </div>

      {members.length === 0 && (
        <p className="sv-hint">No members yet. Use Move… on a student to add them here.</p>
      )}

      <ul style={s.list}>
        {members.map((m) => (
          <li key={m.uid} style={{ position: "relative" }}>
            <div style={{ ...s.memberRow, ...(menuFor === m.uid ? s.memberRowActive : null) }}>
              <span>{m.name}</span>
              {!locked && (
                <button
                  style={s.link}
                  aria-haspopup="menu"
                  aria-expanded={menuFor === m.uid}
                  aria-label={`Move ${m.name}`}
                  onClick={() => onOpenMenu(menuFor === m.uid ? null : m.uid)}
                >
                  Move…
                </button>
              )}
            </div>
            {menuFor === m.uid && <MoveMenu {...menuProps(m)} />}
          </li>
        ))}
      </ul>

      {members.length > 0 && (
        <>
          <p style={{ ...s.muted, margin: "10px 0 6px", fontSize: 12 }}>
            {members.length} {members.length === 1 ? "member" : "members"} &middot; {shared.length} shared{" "}
            {shared.length === 1 ? "time" : "times"}
            {belowRule && <span style={{ color: s.warn }}> &middot; below the {MIN_SHARED_TIMES}-time rule</span>}
          </p>
          <TimeChips times={shared} />
        </>
      )}
    </section>
  );
}

function NeedsGroupPanel({ unplaced, byId, groups, locked, menuFor, onOpenMenu, menuProps, onPlace }) {
  return (
    <section style={s.needsPanel} aria-label="Needs a group">
      <h2 style={{ ...s.subheading, margin: 0, color: s.warn }}>Needs a group ({unplaced.length})</h2>
      <p style={{ ...s.muted, fontSize: 12, margin: "2px 0 10px" }}>Only you see this list.</p>

      {unplaced.map((entry) => {
        const student = byId[entry.uid];
        if (!student) return null;
        const best = previewMove(student, groups, byId).find((o) => o.bestFit);
        return (
          <div key={entry.uid} style={{ ...s.card, position: "relative", marginBottom: 10 }}>
            <strong>{student.name}</strong>
            <NeedsGroupDetails entry={entry} student={student} best={best} />
            {!locked && (
              <div style={{ ...s.row, marginTop: 8 }}>
                {best && (
                  <button className="sv-btn sv-btn-sm sv-btn-primary" onClick={() => onPlace(student, best.groupId)}>
                    Place in {best.name}
                  </button>
                )}
                <button
                  className="sv-btn sv-btn-sm"
                  aria-haspopup="menu"
                  aria-expanded={menuFor === student.uid}
                  aria-label={`Place ${student.name} in a group`}
                  onClick={() => onOpenMenu(menuFor === student.uid ? null : student.uid)}
                >
                  Place in group…
                </button>
              </div>
            )}
            {menuFor === student.uid && <MoveMenu {...menuProps(student)} />}
          </div>
        );
      })}

      <p style={{ ...s.muted, fontSize: 12, borderTop: `1px solid ${color.border}`, paddingTop: 8 }}>
        Requests for hours name no group and no classmate. Students only see &ldquo;{HOUR_REQUEST_MESSAGE}&rdquo;
      </p>
    </section>
  );
}

function NeedsGroupDetails({ entry, student, best }) {
  const lines = [];
  if (entry.askedAt) {
    lines.push(<li key="asked">🕒 Asked for hours &middot; {formatDay(entry.askedAt)}</li>);
    const answeredAfter = student.updatedAt && toMillis(student.updatedAt) > toMillis(entry.askedAt);
    if (answeredAfter && student.ifNeeded.length > 0) {
      lines.push(
        <li key="added" style={{ color: color.success }}>
          ✓ Added {student.ifNeeded.length} &ldquo;if needed&rdquo; {student.ifNeeded.length === 1 ? "hour" : "hours"}
        </li>
      );
    }
  }
  return (
    <>
      {lines.length > 0 && <ul style={{ ...s.list, fontSize: 12, color: color.subtext, margin: "4px 0" }}>{lines}</ul>}
      <p style={{ fontSize: 13, margin: "4px 0 0" }}>
        {best
          ? `Shares ${joinTimes(best.shared)} with ${best.name}.`
          : unplacedReason(student)}
      </p>
    </>
  );
}

function MoveMenu({ student, options, onMove, onAsk, onRemove, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target) && !e.target.closest?.("[aria-haspopup]")) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [onClose]);

  return (
    <div ref={ref} role="menu" aria-label={`Move ${student.name} to`} style={s.menu}>
      <p style={{ fontWeight: 600, margin: 0 }}>Move {student.name} to…</p>
      <p style={{ ...s.muted, fontSize: 12, margin: "2px 0 8px" }}>
        Each group shows what the move does to its shared meeting times.
      </p>

      {options.length === 0 && <p className="sv-hint">There are no other groups. Add a group first.</p>}

      {options.map((o) => (
        <MoveOption key={o.groupId} option={o} student={student} onMove={onMove} />
      ))}

      <div style={{ borderTop: `1px solid ${color.border}`, marginTop: 8, paddingTop: 8 }}>
        <button role="menuitem" style={s.menuAction} onClick={onAsk}>
          🕒 Ask {student.name} to add hours
        </button>
        <button role="menuitem" style={{ ...s.menuAction, color: color.danger }} onClick={onRemove}>
          ✕ Remove from this round
        </button>
      </div>
    </div>
  );
}

function MoveOption({ option, student, onMove }) {
  const { name, status, shared, sharedBefore, sizeAfter, overMax, conflictWith, bestFit } = option;
  const count = `${shared.length} shared ${shared.length === 1 ? "time" : "times"}`;
  const times = shared.length > 0 ? ` (${joinTimes(shared, ", ")})` : "";

  let detail;
  if (status === "conflict") {
    detail = (
      <span>
        <strong style={{ color: color.danger }}>Block list conflict.</strong>{" "}
        {blockConflictText(student, conflictWith)} Only you see this.
      </span>
    );
  } else if (status === "belowRule") {
    detail = (
      <span>
        <strong style={{ color: s.warn }}>Drops to {count}</strong>
        {times} &middot; below the {MIN_SHARED_TIMES}-time rule
      </span>
    );
  } else {
    detail = (
      <span>
        <strong style={{ color: color.success }}>
          {sharedBefore !== null && shared.length < sharedBefore ? "Drops to" : "Keeps"} {count}
        </strong>
        {times} &middot; {name} goes to {sizeAfter}
        {overMax && <span style={{ color: s.warn }}> (over the {MAX_GROUP_SIZE}-person limit)</span>}
      </span>
    );
  }

  const bg = status === "conflict" ? s.conflictBg : bestFit ? s.bestBg : "transparent";
  return (
    <div style={{ ...s.option, background: bg }}>
      <div style={{ fontSize: 13 }}>
        <div style={{ fontWeight: 600 }}>
          {status === "conflict" && "⊘ "}
          {name}
          {bestFit && <span style={s.bestBadge}>Best fit</span>}
        </div>
        {detail}
      </div>
      {status === "conflict" ? (
        <button role="menuitem" className="sv-btn sv-btn-sm" disabled>
          Can&rsquo;t move
        </button>
      ) : (
        <button
          role="menuitem"
          aria-label={`Move to ${name}`}
          className={bestFit ? "sv-btn sv-btn-sm sv-btn-primary" : "sv-btn sv-btn-sm"}
          onClick={() => onMove(option.groupId)}
        >
          Move
        </button>
      )}
    </div>
  );
}

const MAX_CHIPS = 4;

function TimeChips({ times }) {
  if (times.length === 0) return <p style={{ ...s.muted, fontSize: 12, margin: 0 }}>No shared times.</p>;
  const shown = times.slice(0, MAX_CHIPS);
  return (
    <div style={{ ...s.row, gap: 6 }}>
      {shown.map((t) => (
        <TimeChip key={t.slot} time={t} />
      ))}
      {times.length > MAX_CHIPS && <span style={{ fontSize: 12 }}>+{times.length - MAX_CHIPS} more</span>}
    </div>
  );
}

// Solid: everyone is free. Dashed: someone marked it "if needed".
function TimeChip({ time, label }) {
  return (
    <span
      style={{ ...s.chip, borderStyle: time.ifNeeded ? "dashed" : "solid" }}
      title={time.ifNeeded ? "Someone marked this time \"if needed\"" : "Everyone is free"}
    >
      {label ?? slotLabel(time.slot)}
    </span>
  );
}

function joinTimes(shared, sep = " and ") {
  const labels = shared.slice(0, 3).map((t) => slotLabel(t.slot));
  if (sep !== " and " || labels.length < 2) return labels.join(sep);
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value === "string") return Date.parse(value);
  if (value.toMillis) return value.toMillis();
  if (value.seconds) return value.seconds * 1000;
  return 0;
}

function formatDay(value) {
  return new Date(toMillis(value)).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

const color = {
  text: "var(--text)",
  subtext: "var(--subtext)",
  background: "var(--background)",
  surface: "var(--surface)",
  surfaceHover: "var(--surface-hover)",
  border: "var(--border)",
  accent: "var(--accent)",
  accentSoft: "var(--accent-soft)",
  danger: "var(--danger)",
  success: "var(--success)",
  warn: "var(--if-needed)",
};

const s = {
  warn: color.warn,
  bestBg: color.accentSoft,
  conflictBg: "color-mix(in srgb, var(--danger) 12%, transparent)",
  row: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 },
  spread: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  subheading: { fontSize: "1rem", fontWeight: 700, margin: "0 0 4px" },
  muted: { color: color.subtext, fontSize: "0.875rem", margin: "0 0 12px" },
  summary: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 24,
    padding: "10px 14px",
    margin: "12px 0 0",
    fontSize: 14,
    background: color.surface,
    border: `1px solid ${color.border}`,
    borderRadius: 8,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 16,
    alignItems: "start",
  },
  card: {
    background: color.surface,
    border: `1px solid ${color.border}`,
    borderRadius: 8,
    padding: 14,
  },
  needsPanel: {
    background: "color-mix(in srgb, var(--if-needed) 8%, transparent)",
    border: `1px solid ${color.warn}`,
    borderRadius: 8,
    padding: 14,
  },
  list: { listStyle: "none", margin: 0, padding: 0 },
  memberRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "4px 6px",
    borderRadius: 6,
    fontSize: 14,
  },
  memberRowActive: { background: color.surfaceHover, outline: `1px solid ${color.accent}` },
  link: {
    background: "none",
    border: "none",
    color: color.accent,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    padding: "0 4px",
    marginLeft: 6,
  },
  reviewedBadge: {
    background: "color-mix(in srgb, var(--success) 15%, transparent)",
    color: color.success,
    border: "none",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    padding: "2px 10px",
    cursor: "pointer",
  },
  chip: {
    display: "inline-block",
    fontSize: 12,
    padding: "2px 8px",
    borderRadius: 4,
    border: `1px solid ${color.accent}`,
    color: color.text,
  },
  menu: {
    position: "absolute",
    top: "100%",
    left: 0,
    zIndex: 20,
    width: 340,
    maxWidth: "90vw",
    background: color.surface,
    border: `1px solid ${color.border}`,
    borderRadius: 8,
    boxShadow: "var(--shadow)",
    padding: 12,
  },
  option: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  bestBadge: {
    marginLeft: 6,
    fontSize: 11,
    padding: "1px 6px",
    borderRadius: 4,
    background: "color-mix(in srgb, var(--success) 15%, transparent)",
    color: color.success,
  },
  menuAction: {
    display: "block",
    width: "100%",
    textAlign: "left",
    background: "none",
    border: "none",
    color: color.text,
    cursor: "pointer",
    fontSize: 13,
    padding: "4px 0",
  },
};
