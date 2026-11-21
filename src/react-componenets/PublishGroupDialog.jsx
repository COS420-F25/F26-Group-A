import { useEffect, useId, useRef, useState } from "react";

function PublishDialogHeader({ roundNumber, studentCount, groupCount, instructorName, courseName, onClose, disabled }) {
    const students = studentCount === 1 ? "student" : "students";
    const groups = groupCount === 1 ? "group" : "groups";
    const summary = [
        `${studentCount} ${students} in ${groupCount} ${groups}`,
        instructorName,
        courseName,
    ].filter(Boolean).join(" · ");

    return (
        <header className="sv-head publish-dialog-header">
            <div>
                <h2 className="sv-title">Publish Round {roundNumber} {groups}?</h2>
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
                Survey answers, block lists, and optional demographic answers are
                never shown to anyone but you.
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
            <span><strong>{warning.title}</strong> {warning.message}</span>
        </label>
    );
}

function PublishWarningChecklist({ warnings, acceptedWarningIds, onWarningChange, blockers, disabled }) {
    const headingId = useId();
    const acceptedCount = warnings.filter((warning) => acceptedWarningIds.has(warning.id)).length;
    const allAccepted = acceptedCount === warnings.length;

    return (
        <section className="publish-warning-checklist" aria-labelledby={headingId}>
            <div className="sv-card-head publish-warning-heading">
                <h3 className="sv-h2" id={headingId}>Check before you publish</h3>
                {warnings.length > 0 && (
                    <span className="publish-warning-count" data-complete={allAccepted} role="status">
                        {allAccepted && <span aria-hidden="true">✓ </span>}
                        {acceptedCount} of {warnings.length} accepted
                    </span>
                )}
            </div>
            <div className="publish-warning-rows">
                {blockers.map((blocker) => (
                    <div key={blocker.id} className="publish-warning-row" data-blocking="true">
                        <span><strong>{blocker.title}</strong> {blocker.message}</span>
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

function PublishDialogFooter({ groupCount, remainingWarnings, canPublish, onClose, onConfirm, publishing, error }) {
    return (
        <footer className="publish-dialog-footer">
            {error && <p className="sv-error" role="alert">{error}</p>}
            <div className="publish-dialog-actions">
                <button type="button" className="sv-btn" onClick={onClose} disabled={publishing}>Back to review</button>
                <button
                    type="button"
                    className="sv-btn sv-btn-primary"
                    onClick={() => onConfirm()}
                    disabled={!canPublish || remainingWarnings > 0}
                >
                    {publishing ? "Publishing…" : `Publish ${groupCount} ${groupCount === 1 ? "group" : "groups"}`}
                </button>
            </div>
        </footer>
    );
}

export default function PublishGroupDialog({ review, children, onClose, onConfirm, blockers = [], publishing = false, error }) {
    const dialogRef = useRef(null);
    const [acceptedWarningIds, setAcceptedWarningIds] = useState(() => new Set());
    const warnings = review?.warnings ?? [];
    const remainingWarnings = warnings.filter((warning) => !acceptedWarningIds.has(warning.id)).length;
    const canPublish = blockers.length === 0 && !publishing;

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
                </>
            )}
            {children}
            {review && onConfirm && (
                <PublishDialogFooter
                    groupCount={review.groupCount}
                    remainingWarnings={remainingWarnings}
                    canPublish={canPublish}
                    onClose={dismiss}
                    onConfirm={onConfirm}
                    publishing={publishing}
                    error={error}
                />
            )}
        </dialog>
    );
}
