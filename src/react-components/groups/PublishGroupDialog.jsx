import { useEffect, useId, useRef, useState } from "react";
import { createDemoGroupService } from "@groups/demoGroupService";
import { sharedTimes, studentsFromSurvey } from "@groups/groupRounds";
import { hourLabel } from "@utils/slots";

function PublishDialogHeader({
  roundNumber,
  studentCount,
  groupCount,
  instructorName,
  courseName,
  onClose,
  disabled,
}) {
  const students = studentCount === 1 ? "student" : "students";

  const groups = groupCount === 1 ? "group" : "groups";
  const summary = [
    `${studentCount} ${students} in ${groupCount} ${groups}`,
    instructorName,
    courseName,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <header className="sv-head publish-dialog-header">
      <div>
        <h2 className="sv-title">
          Publish Round {roundNumber} {groups}?
        </h2>
        <p className="sv-sub">{summary}</p>
      </div>
      <button
        type="button"
        className="sv-btn sv-btn-sm"
        aria-label="Close publish dialog"
        onClick={onClose}
        disabled={disabled}
      >
        ×
      </button>
    </header>
  );
}

function PublishPrivacyNotice() {
  return (
    <p className="sv-banner publish-privacy-notice">
      <svg
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      >
        <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
      <span>
        Students will only see who is in their own group and when it can meet.
        Survey answers, block lists, and optional demographic answers are never
        shown to anyone but you.
      </span>
    </p>
  );
}

function PublishWarningRow({ warning, accepted, onWarningChange, disabled }) {
  return (
    <label className="publish-warning-row" data-blocking="false">
      <input
        type="checkbox"
        checked={accepted}
        onChange={(event) => onWarningChange(warning.id, event.target.checked)}
        disabled={disabled}
      />
      <span>
        <strong>{warning.title}</strong> {warning.message}
      </span>
    </label>
  );
}

function PublishWarningChecklist({
  warnings,
  acceptedWarningIds,
  onWarningChange,
  blockers,
  disabled,
}) {
  const headingId = useId();
  const acceptedCount = warnings.filter((warning) =>
    acceptedWarningIds.has(warning.id),
  ).length;
  const allAccepted = acceptedCount === warnings.length;

  return (
    <section className="publish-warning-checklist" aria-labelledby={headingId}>
      <div className="sv-card-head publish-warning-heading">
        <h3 className="sv-h2" id={headingId}>
          Check before you publish
        </h3>
        {warnings.length > 0 && (
          <span
            className="publish-warning-count"
            data-complete={allAccepted}
            role="status"
          >
            {allAccepted && <span aria-hidden="true">✓ </span>}
            {acceptedCount} of {warnings.length} accepted
          </span>
        )}
      </div>
      <div className="publish-warning-rows">
        {blockers.map((blocker) => (
          <div
            key={blocker.id}
            className="publish-warning-row"
            data-blocking="true"
          >
            <span>
              <strong>{blocker.title}</strong> {blocker.message}
            </span>
          </div>
        ))}
        {warnings.map((warning) => (
          <PublishWarningRow
            key={warning.id}
            warning={warning}
            accepted={acceptedWarningIds.has(warning.id)}
            onWarningChange={onWarningChange}
            disabled={disabled}
          />
        ))}
      </div>
    </section>
  );
}

function StudentNoteInput({ note, maxLength, onNoteChange, disabled }) {
  const id = useId();
  const wordCount = note.trim().split(/\s+/).filter(Boolean).length;

  return (
    <section className="sv-field publish-student-note">
      <h3 className="sv-h2">
        <label htmlFor={id}>Note to Students (Optional)</label>
      </h3>

      <textarea
        id={id}
        className="sv-input"
        rows={3}
        value={note}
        maxLength={maxLength}
        onChange={(event) => onNoteChange(event.target.value)}
        disabled={disabled}
        aria-describedby={`${id}-help ${id}-count`}
      />

      <div className="sv-row sv-muted sv-small">
        <p id={`${id}-count`}>
          {wordCount} {wordCount === 1 ? "word" : "words"} · {note.length} /{" "}
          {maxLength} characters
        </p>
        <p id={`${id}-help`} className="publish-student-note-help">
          This will be the first message in each group channel
        </p>
      </div>
    </section>
  );
}

const padlockIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-lock"
    aria-hidden="true"
  >
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const bellIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-bell"
    aria-hidden="true"
  >
    <path d="M10.268 21a2 2 0 0 0 3.464 0" />
    <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
  </svg>
);

const swapIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-arrow-left-right"
    aria-hidden="true"
  >
    <path d="M8 3 4 7l4 4" />
    <path d="M4 7h16" />
    <path d="m16 21 4-4-4-4" />
    <path d="M20 17H4" />
  </svg>
);

const warningIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-triangle-exclamation-point"
    aria-hidden="true"
  >
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

function PublishEffectItem({ icon, text }) {
  return (
    <li className="publish-effect-item">
      {icon}
      <span>{text}</span>
    </li>
  );
}

function PublishEffect() {
  const effectBlock = [
    {
      id: 0,
      text: "Each group gets a private channel. Only its members and you can read it",
      icon: padlockIcon,
    },
    {
      id: 1,
      text: "You can still add, move, remove, students. Groups update right away.",
      icon: swapIcon,
    },
    {
      id: 2,
      text: "Students get an in-app notification and an email with their group",
      icon: bellIcon,
    },
    {
      id: 3,
      text: "Changes after publishing are logged. Groups can not be unpublished",
      icon: warningIcon,
    },
  ];

  return (
    <section className="publish-effect">
      <h3 className="sv-h2">When you publish</h3>
      <ul className="publish-effect-list">
        {effectBlock.map((effect) => (
          <PublishEffectItem
            key={effect.id}
            icon={effect.icon}
            text={effect.text}
          />
        ))}
      </ul>
    </section>
  );
}

function PublishDialogFooter({
  groupCount,
  remainingWarnings,
  canPublish,
  onClose,
  onConfirm,
  publishing,
  error,
}) {
  return (
    <footer className="publish-dialog-footer">
      {error && (
        <p className="sv-error" role="alert">
          {error}
        </p>
      )}
      <div className="publish-dialog-actions">
        <button
          type="button"
          className="sv-btn"
          onClick={onClose}
          disabled={publishing}
        >
          Back to review
        </button>
        <button
          type="button"
          className="sv-btn sv-btn-primary"
          onClick={() => onConfirm()}
          disabled={!canPublish || remainingWarnings > 0}
        >
          {publishing
            ? "Publishing…"
            : `Publish ${groupCount} ${groupCount === 1 ? "group" : "groups"}`}
        </button>
      </div>
    </footer>
  );
}

async function loadDemoGroupPreview() {
  const service = createDemoGroupService();
  const [survey, roster, responses, round] = await Promise.all([
    service.getSurvey(),
    service.getStudents(),
    service.getResponses(),
    service.getLatestRound(),
  ]);

  const students = studentsFromSurvey(survey, roster, responses);
  const byUid = new Map(students.map((student) => [student.uid, student]));
  const group = round.groups.find(({ memberIds }) =>
    memberIds.some((uid) => byUid.has(uid)),
  );
  if (!group) return null;

  const members = group.memberIds.map((uid) => byUid.get(uid)).filter(Boolean);
  const avatarColors = [
    "#a91555",
    "#2848c9",
    "#087669",
    "#a33d10",
    "#6d28d9",
    "#1e6091",
  ];

  for (let index = avatarColors.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [avatarColors[index], avatarColors[swapIndex]] = [
      avatarColors[swapIndex],
      avatarColors[index],
    ];
  }

  return {
    groupName: group.name,
    viewerUid: members[0].uid,
    members: members.map(({ uid, name }, index) => ({
      uid,
      displayName: name,
      avatarColor: avatarColors[index % avatarColors.length],
    })),
    meetingSlots: sharedTimes(members).map(({ slot, ifNeeded }) => {
      const [day, hour] = slot.split("-");
      const start = hourLabel(Number(hour));
      const end = hourLabel(Number(hour) + 1);
      const startLabel =
        start.slice(-2) === end.slice(-2) ? start.slice(0, -3) : start;

      return { slotID: slot, label: `${day} ${startLabel}–${end}`, ifNeeded };
    }),
  };
}

function DemoStudentGroupPreview() {
  const [preview, setPreview] = useState(undefined);

  useEffect(() => {
    let active = true;

    loadDemoGroupPreview()
      .catch(() => null)
      .then((result) => {
        if (active) setPreview(result);
      });

    return () => {
      active = false;
    };
  }, []);

  if (preview) return <StudentGroupPreview preview={preview} />;

  return (
    <p className="sv-hint" role="status" style={{ marginInline: "1.5rem" }}>
      {preview === undefined
        ? "Loading student preview…"
        : "Student preview unavailable."}
    </p>
  );
}

function StudentGroupPreview({ preview }) {
  const { groupName, viewerUid, members, meetingSlots } = preview;

  return (
    <section style={{ marginInline: "1.5rem" }}>
      <header className="sv-card-head sv-row sv-muted sv-small">
        <h3>What a student will see</h3>
        <span>Example: {groupName}</span>
      </header>

      <StudentGroupPreviewCard groupName={groupName}>
        <ul className="sv-row" aria-label="Group members">
          {members.map((student) => (
            <PreviewStudentChip
              key={student.uid}
              student={student}
              isSelf={student.uid === viewerUid}
            />
          ))}
        </ul>

        <div className="sv-row" style={{ marginTop: "0.5rem" }}>
          <strong className="sv-small sv-muted">Can meet</strong>
          {meetingSlots.length === 0 && <span>No shared times yet.</span>}
          {meetingSlots.map((slot) => (
            <PreviewMeetingSlotChip key={slot.slotID} slot={slot} />
          ))}
        </div>
      </StudentGroupPreviewCard>
    </section>
  );
}

function StudentGroupPreviewCard({ groupName, children }) {
  return (
    <div className="sv-card" style={{ background: "var(--surface-hover)" }}>
      <h4 className="sv-h2">Your reflection group: {groupName}</h4>
      {children}
    </div>
  );
}

function PreviewStudentChip({ student, isSelf }) {
  const initials = student.displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();

  return (
    <li className="sv-row">
      <span
        className="sv-avatar"
        style={{ backgroundColor: student.avatarColor }}
        aria-hidden="true"
      >
        {initials}
      </span>
      <span>
        {student.displayName}
        {isSelf && " (you)"}
      </span>
    </li>
  );
}

function PreviewMeetingSlotChip({ slot }) {
  return (
    <span
      className="sv-pill"
      style={
        slot.ifNeeded ? { outline: "1px dashed var(--accent)" } : undefined
      }
    >
      {slot.label}
      {slot.ifNeeded && " · if needed"}
    </span>
  );
}

export default function PublishGroupDialog({
  review,
  unplacedStudents = [],
  children,
  onClose,
  onConfirm,
  blockers = [],
  publishing = false,
  error,
}) {
  const dialogRef = useRef(null);
  const [acceptedWarningIds, setAcceptedWarningIds] = useState(() => new Set());
  const warnings = [
    ...(review?.warnings ?? []),
    ...unplacedStudents.map(({ uid, name, reason }) => ({
      id: `unplaced-student:${uid}`,
      title: `${name} still needs a group.`,
      message: reason,
    })),
  ];
  const remainingWarnings = warnings.filter(
    (warning) => !acceptedWarningIds.has(warning.id),
  ).length;
  const canPublish = blockers.length === 0 && !publishing;
  const [note, setNote] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog.open) {
      dialog.showModal();
    }
  }, []);

  function dismiss() {
    dialogRef.current.close();
  }

  function onWarningChange(id, accepted) {
    setAcceptedWarningIds((previous) => {
      const next = new Set(previous);
      if (accepted) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <dialog
      ref={dialogRef}
      className="publish-group-dialog"
      aria-label="Publish groups"
      onClose={onClose}
      onCancel={(event) => {
        if (publishing) event.preventDefault();
      }}
    >
      {review && (
        <>
          <PublishDialogHeader
            roundNumber={review.roundNumber}
            studentCount={review.studentCount}
            groupCount={review.groupCount}
            instructorName={review.instructorName}
            courseName={review.courseName}
            onClose={dismiss}
            disabled={publishing}
          />
          <PublishPrivacyNotice />
          {(warnings.length > 0 || blockers.length > 0) && (
            <PublishWarningChecklist
              warnings={warnings}
              acceptedWarningIds={acceptedWarningIds}
              onWarningChange={onWarningChange}
              blockers={blockers}
              disabled={publishing}
            />
          )}
          <PublishEffect />
          <StudentNoteInput
            note={note}
            maxLength={500}
            onNoteChange={setNote}
            disabled={publishing}
          />
          <DemoStudentGroupPreview />
        </>
      )}
      {children}
      {review && onConfirm && (
        <PublishDialogFooter
          groupCount={review.groupCount}
          remainingWarnings={remainingWarnings}
          canPublish={canPublish}
          onClose={dismiss}
          onConfirm={() => onConfirm(note.trim())}
          publishing={publishing}
          error={error}
        />
      )}
    </dialog>
  );
}
