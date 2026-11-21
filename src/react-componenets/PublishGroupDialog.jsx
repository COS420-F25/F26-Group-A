import { useEffect, useId, useRef, useState } from "react";
export { warningIcon, bellIcon, padlockIcon, swapIcon }

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

const padlockIcon = (
        <svg 
            xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" 
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
            strokelinejoin="round" class="lucide lucide-lock preview-icon" aria-hidden="true">
            
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
    
);

const bellIcon = (
        <svg 
            xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" 
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" 
            class="lucide lucide-bell preview-icon">
            <path d="M10.268 21a2 2 0 0 0 3.464 0"/>
            <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>
        </svg>
);

const swapIcon = (
        <svg 
            xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" 
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" 
            class="lucide lucide-arrow-left-right preview-icon">
            <path d="M8 3 4 7l4 4"/>
            <path d="M4 7h16"/>
            <path d="m16 21 4-4-4-4"/>
            <path d="M20 17H4"/>
        </svg>
);


const warningIcon = (
        <svg 
            xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" 
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" 
            class="lucide lucide-triangle-exclamation-point preview-icon">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/>
            <path d="M12 9v4"/>
            <path d="M12 17h.01"/>
        </svg>
);

function PublishEffectItem({ icon, text }) {
    return (
        <p className="sv-banner publish-effects">
            <span>
                Filler text
            </span>
        </p>
    );
}

function PublishEffect() {
    const icons =[{
        id: 0,
        text: 'When you Publish',
        icon: null
    }, {
        id: 1,
        text: 'Each group gets a private channel. Only its members and you can read it',
        icon: padlockIcon
    }, {
        id: 2,
        text: 'You can still add, move, remove, students. Groups update right away.',
        icon: swapIcon
    }, {
        id: 3,
        text: 'Students get an in-app notification and an email with their group',
        icon: bellIcon       
    }, {
        id: 4,
        text: 'Changes after publishing are logged. Groups can not be unpublished',
        icon: warningIcon
    }]
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
                    {/* Put Publish Event Here */}
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
