import { useEffect, useRef } from "react";

function PublishDialogHeader({ roundNumber, studentCount, groupCount, instructorName, courseName, onClose }) {
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
            <button type="button" className="sv-btn sv-btn-sm" aria-label="Close publish dialog" onClick={onClose}>
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

export default function PublishGroupDialog({ review, children, onClose }) {
    const dialogRef = useRef(null);

    useEffect(() => {
        const dialog = dialogRef.current;

        if (!dialog.open) {
            dialog.showModal();
        }
    }, []);

    return (
        <dialog
            ref={dialogRef}
            className="publish-group-dialog"
            aria-label="Publish groups"
            onClose={onClose}
        >
            {review && (
                <>
                    <PublishDialogHeader
                        roundNumber={review.roundNumber}
                        studentCount={review.studentCount}
                        groupCount={review.groupCount}
                        instructorName={review.instructorName}
                        courseName={review.courseName}
                        onClose={() => dialogRef.current.close()}
                    />
                    <PublishPrivacyNotice />
                </>
            )}
            {children}
        </dialog>
    );
}
