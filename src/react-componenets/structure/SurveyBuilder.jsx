import { useEffect, useState } from "react";
import { ActionBar, Page } from "./AppShell";
import Breadcrumb from "./Breadcrumb";
import { DEFAULT_QUESTIONS, sendSurvey, getStudents } from "../utils/surveyService";

const STEPS = ["Basics", "Questions", "Students", "Review"];

export default function SurveyBuilder({ user, onCreated, onCancel }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState(DEFAULT_QUESTIONS);

  const [newQType, setNewQType] = useState("text");
  const [newQLabel, setNewQLabel] = useState("");
  const [newQOptions, setNewQOptions] = useState("Option 1, Option 2");

  const [allStudents, setAllStudents] = useState([]);
  const [targetStudentUids, setTargetStudentUids] = useState([]);
  const [selectedTab, setSelectedTab] = useState("all");

  const [startHour] = useState(8);
  const [endHour] = useState(22);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getStudents().then(setAllStudents).catch(() => {});
  }, []);

  function problemFor(index) {
    if (index === 0 && !title.trim()) return "Give the survey a title.";
    if (index === 1 && questions.length === 0) return "Add at least one question.";
    return null;
  }

  function goNext() {
    const problem = problemFor(stepIndex);
    if (problem) return setError(problem);
    setError("");
    setStepIndex(stepIndex + 1);
  }

  function goBack() {
    setError("");
    if (stepIndex === 0) return onCancel?.();
    setStepIndex(stepIndex - 1);
  }

  function addQuestion() {
    if (!newQLabel.trim()) return setError("Question label cannot be empty.");
    const q = {
      id: "q_" + Math.random().toString(36).substring(2, 9),
      type: newQType,
      label: newQLabel.trim(),
      options: newQType === "choice" ? newQOptions.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
      required: true,
    };
    setQuestions([...questions, q]);
    setNewQLabel("");
    setError("");
  }

  async function handleCreate() {
    setError("");
    setSending(true);
    try {
      const id = await sendSurvey(user, {
        title,
        description,
        questions,
        targetStudentUids: selectedTab === "all" ? [] : targetStudentUids,
        startHour,
        endHour,
      });
      onCreated?.(id);
    } catch (err) {
      setError("Could not create the survey: " + err.message);
      setSending(false);
    }
  }

  const isLast = stepIndex === STEPS.length - 1;

  const footer = (
    <ActionBar note={`Step ${stepIndex + 1} of ${STEPS.length}`}>
      <button type="button" className="sv-btn" onClick={goBack} disabled={sending}>
        {stepIndex === 0 ? "Cancel" : "Back"}
      </button>
      {isLast ? (
        <button type="button" className="sv-btn sv-btn-primary" onClick={handleCreate} disabled={sending}>
          {sending ? "Creating..." : "Create survey"}
        </button>
      ) : (
        <button type="button" className="sv-btn sv-btn-primary" onClick={goNext}>
          Next
        </button>
      )}
    </ActionBar>
  );

  return (
    <Page footer={footer}>
      <Breadcrumb
        steps={STEPS}
        current={stepIndex}
        label="Create survey steps"
        onSelect={(i) => {
          setError("");
          setStepIndex(i);
        }}
      />
      <div className="sv-head">
        <div>
          <h1 className="sv-title">Create survey</h1>
          <p className="sv-sub">Configure questions and target students.</p>
        </div>
      </div>

      {stepIndex === 0 && (
        <section className="sv-card">
          <h2 className="sv-h2">1. Basics</h2>
          <div className="sv-field">
            <label className="sv-label" htmlFor="survey-title">Title</label>
            <input
              id="survey-title"
              className="sv-input"
              value={title}
              maxLength={120}
              placeholder="Week 1 study groups"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="sv-field">
            <label className="sv-label" htmlFor="survey-description">Message to students (optional)</label>
            <textarea
              id="survey-description"
              className="sv-input"
              value={description}
              maxLength={1000}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </section>
      )}

      {stepIndex === 1 && (
        <section className="sv-card">
          <h2 className="sv-h2">2. Configure Questions</h2>
          <p className="sv-hint">Default questions are preloaded. Add, customize, or remove items as needed.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
            {questions.map((q, idx) => (
              <div key={q.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.75rem", background: "var(--sv-bg)", border: "1px solid var(--sv-border)", borderRadius: "0.5rem" }}>
                <div>
                  <strong>{idx + 1}. {q.label}</strong> <span className="sv-badge">({q.type})</span>
                </div>
                <button
                  type="button"
                  className="sv-btn sv-btn-sm"
                  onClick={() => setQuestions(questions.filter((item) => item.id !== q.id))}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div style={{ padding: "1rem", background: "var(--sv-bg)", border: "1px dashed var(--sv-border)", borderRadius: "0.75rem" }}>
            <h3 className="sv-h2" style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>Add custom question</h3>
            <div className="sv-field">
              <label className="sv-label">Question Type</label>
              <select className="sv-input" value={newQType} onChange={(e) => setNewQType(e.target.value)}>
                <option value="text">Short Text</option>
                <option value="choice">Multiple Choice</option>
              </select>
            </div>
            <div className="sv-field">
              <label className="sv-label">Question Label / Prompt</label>
              <input className="sv-input" value={newQLabel} placeholder="e.g. What is your preferred study format?" onChange={(e) => setNewQLabel(e.target.value)} />
            </div>
            {newQType === "choice" && (
              <div className="sv-field">
                <label className="sv-label">Options (comma separated)</label>
                <input className="sv-input" value={newQOptions} onChange={(e) => setNewQOptions(e.target.value)} />
              </div>
            )}
            <button type="button" className="sv-btn" onClick={addQuestion}>Add Question</button>
          </div>
        </section>
      )}

      {stepIndex === 2 && (
        <section className="sv-card">
          <h2 className="sv-h2">3. Select Students</h2>
          <p className="sv-hint">Choose whether to send this survey to everyone or specific students.</p>

          <div className="sv-seg" style={{ marginBottom: "1rem" }}>
            <button type="button" className="sv-btn sv-btn-sm" aria-pressed={selectedTab === "all"} onClick={() => setSelectedTab("all")}>
              All Students ({allStudents.length})
            </button>
            <button type="button" className="sv-btn sv-btn-sm" aria-pressed={selectedTab === "specific"} onClick={() => setSelectedTab("specific")}>
              Specific Students
            </button>
          </div>

          {selectedTab === "specific" && (
            <div style={{ maxHeight: "15rem", overflowY: "auto", border: "1px solid var(--sv-border)", borderRadius: "0.5rem", padding: "0.5rem" }}>
              {allStudents.map((s) => {
                const checked = targetStudentUids.includes(s.uid);
                return (
                  <label key={s.uid} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.3rem 0" }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        if (checked) setTargetStudentUids(targetStudentUids.filter((id) => id !== s.uid));
                        else setTargetStudentUids([...targetStudentUids, s.uid]);
                      }}
                    />
                    {s.name} ({s.email})
                  </label>
                );
              })}
            </div>
          )}
        </section>
      )}

      {isLast && (
        <section className="sv-card">
          <h2 className="sv-h2">4. Review</h2>
          <div className="sv-review-row">
            <div>
              <h3 className="sv-review-title">Title & Description</h3>
              <p className="sv-review-list"><strong>{title}</strong></p>
              <p className="sv-review-list sv-muted">{description || "No description"}</p>
            </div>
            <button type="button" className="sv-link-btn" onClick={() => setStepIndex(0)}>Edit</button>
          </div>
          <div className="sv-review-row">
            <div>
              <h3 className="sv-review-title">Questions ({questions.length})</h3>
              <ul className="sv-review-list">
                {questions.map((q, i) => <li key={q.id}>{i + 1}. {q.label} ({q.type})</li>)}
              </ul>
            </div>
            <button type="button" className="sv-link-btn" onClick={() => setStepIndex(1)}>Edit</button>
          </div>
          <div className="sv-review-row">
            <div>
              <h3 className="sv-review-title">Target Students</h3>
              <p className="sv-review-list">{selectedTab === "all" ? "All active students" : `${targetStudentUids.length} selected students`}</p>
            </div>
            <button type="button" className="sv-link-btn" onClick={() => setStepIndex(2)}>Edit</button>
          </div>
        </section>
      )}

      {error && <p className="sv-error" role="alert">{error}</p>}
    </Page>
  );
}
