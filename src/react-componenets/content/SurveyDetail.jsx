import { useEffect, useState } from "react";
import { ActionBar, Page } from "../structure/AppShell";
import Breadcrumb from "../structure/Breadcrumb";
import { getStudents, setSurveyStatus, watchResponses } from "../utils/surveyService";
import { csvFileName, downloadCsv, responsesToCsv } from "../utils/csv";
import { formatRange } from "../utils/slots";

const LIFECYCLE = ["Set up", "Collect responses", "Match", "Review", "Publish"];

function buildMessage(survey, link) {
  return [
    `Subject: ${survey.title}`,
    "",
    "Hi everyone, I am forming study groups. Please fill out this short survey so I can match groups around your availability and interests.",
    ...(survey.description ? ["", survey.description] : []),
    "",
    `Open the survey: ${link}`,
    "Only your instructor sees your answers.",
  ].join("\n");
}

function formatAnswerCell(q, ans) {
  if (ans == null || ans === "") return "—";
  if (q.type === "availability") {
    const avail = Array.isArray(ans) ? ans : ans.available ?? [];
    const ifNeeded = !Array.isArray(ans) ? ans.ifNeeded ?? [] : [];
    const parts = [`${avail.length} free`];
    if (ifNeeded.length > 0) parts.push(`${ifNeeded.length} if needed`);
    return parts.join(", ");
  }
  if (Array.isArray(ans)) {
    return ans.length > 0 ? ans.join(", ") : "—";
  }
  return String(ans);
}

export default function SurveyDetail({ survey, justCreated, onPreview }) {
  const [responses, setResponses] = useState(null);
  const [allStudents, setAllStudents] = useState(null);
  const [studentsFailed, setStudentsFailed] = useState(false);
  const [namesHidden, setNamesHidden] = useState(false);
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");

  useEffect(
    () => watchResponses(survey.id, setResponses, (err) => setError("Could not load answers: " + err.message)),
    [survey.id]
  );

  useEffect(() => {
    let cancelled = false;
    getStudents()
      .then((list) => !cancelled && setAllStudents(list))
      .catch(() => !cancelled && setStudentsFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(""), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const isOpen = survey.status === "open";
  const link = typeof window === "undefined" ? "/survey" : `${window.location.origin}/survey`;
  const message = buildMessage(survey, link);

  // Filter down to targeted students if specific UIDs were selected
  const targetSet =
    survey.targetStudentUids && survey.targetStudentUids.length > 0 ? new Set(survey.targetStudentUids) : null;
  const students = allStudents
    ? targetSet
      ? allStudents.filter((s) => targetSet.has(s.uid))
      : allStudents
    : null;

  const answeredCount = responses?.length ?? 0;
  const answeredIds = new Set((responses ?? []).map((r) => r.uid));
  const waiting = students ? students.filter((s) => !answeredIds.has(s.uid)) : [];
  const total = students?.length ?? 0;
  const percent = total > 0 ? Math.min(100, Math.round((answeredCount / total) * 100)) : 0;

  const questions = survey.questions || [];

  async function copy(text, which) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
    } catch {
      setError("Could not copy. Select the text and copy it yourself.");
    }
  }

  async function toggleStatus() {
    setError("");
    try {
      await setSurveyStatus(survey.id, isOpen ? "closed" : "open");
    } catch (err) {
      setError("Could not change the survey: " + err.message);
    }
  }

  function handleDownload() {
    if (responses) downloadCsv(csvFileName(survey.title), responsesToCsv(responses, questions));
  }

  const footer = (
    <ActionBar note={isOpen ? "You can reopen it later." : "Students can no longer answer."}>
      <button type="button" className="sv-btn" onClick={onPreview}>
        Preview as student
      </button>
      <button type="button" className="sv-btn" onClick={handleDownload} disabled={!responses}>
        Download CSV
      </button>
      <button type="button" className="sv-btn sv-btn-primary" onClick={toggleStatus}>
        {isOpen ? "Close survey" : "Reopen survey"}
      </button>
    </ActionBar>
  );

  return (
    <Page footer={footer}>
      <Breadcrumb steps={LIFECYCLE} current={1} label="Survey progress" />
      <div className="sv-head">
        <div>
          <h1 className="sv-title">
            {survey.title} is {isOpen ? "open" : "closed"}
          </h1>
          <p className="sv-sub">Monday to Sunday, {formatRange(survey.startHour, survey.endHour)}</p>
        </div>
        <span className={isOpen ? "sv-badge sv-badge-open" : "sv-badge"}>{isOpen ? "Open" : "Closed"}</span>
      </div>

      {justCreated && (
        <div className="sv-banner" role="status">
          Survey created. Students can see it now. Use Preview as student to click through it.
        </div>
      )}
      {error && (
        <p className="sv-error" role="alert">
          {error}
        </p>
      )}

      <div className="sv-card">
        <div className="sv-stat">
          <span>
            <strong>
              {answeredCount}
              {students && total > 0 ? ` of ${total}` : ""}
            </strong>{" "}
            students have answered
          </span>
        </div>
        {students && total > 0 && (
          <div
            className="sv-progress"
            role="progressbar"
            aria-label="Students who have answered"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <span style={{ width: `${percent}%` }} />
          </div>
        )}
      </div>

      <div className="sv-two-col">

        <div className="sv-card">
          <div className="sv-card-head">
            <h2 className="sv-h2">
              {students
                ? `Still waiting on ${waiting.length} ${waiting.length === 1 ? "student" : "students"}`
                : "Still waiting on"}
            </h2>
            {students && waiting.length > 0 && (
              <button type="button" className="sv-btn sv-btn-sm" onClick={() => setNamesHidden(!namesHidden)}>
                {namesHidden ? "Show names" : "Hide names"}
              </button>
            )}
          </div>
          <p className="sv-hint">Only you see this list. Students are never told who has or has not answered.</p>
          {studentsFailed && <p className="sv-hint">Could not load the student list.</p>}
          {!students && !studentsFailed && <p className="sv-hint">Loading...</p>}
          {students && waiting.length === 0 && <p className="sv-hint">Everyone has answered.</p>}
          {students && waiting.length > 0 && !namesHidden && (
            <ul className="sv-list">
              {waiting.map((student) => (
                <li key={student.uid}>
                  <span>{student.name || student.email}</span>
                  <span className="sv-muted">Not started</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="sv-card">
        <h2 className="sv-h2">Answers</h2>
        {responses === null && !error && <p className="sv-hint">Loading...</p>}
        {responses?.length === 0 && <p className="sv-hint">No answers yet.</p>}
        {responses?.length > 0 && (
          <div className="sv-table-wrap">
            <table className="sv-table">
              <thead>
                <tr>
                  <th scope="col">Student</th>
                  {questions.map((q) => (
                    <th key={q.id} scope="col">
                      {q.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {responses.map((r) => (
                  <tr key={r.uid}>
                    <td>{r.name || r.email}</td>
                    {questions.map((q) => (
                      <td key={q.id}>{formatAnswerCell(q, r.answers?.[q.id])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Page>
  );
}
