import { useState } from "react";
import { ActionBar, Page } from "./AppShell";
import Breadcrumb from "./Breadcrumb";
import { DEFAULT_TAGS, sendSurvey } from "./surveyService";
import { formatRange, hourLabel } from "./slots";

// The parts of creating a survey, in order
const STEPS = ["Basics", "Hours", "Interests", "Review"];

// Creates a survey in four steps: basics, hours, interests, review.
// onCreated is called with the new survey's id.
// onCancel is called if the instructor leaves from the first step.
export default function SurveyBuilder({ user, onCreated, onCancel }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(22);
  const [tags, setTags] = useState(DEFAULT_TAGS);
  const [tagInput, setTagInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // Returns a message if this step is not filled in, or null if it is fine
  function problemFor(index) {
    if (index === 0 && !title.trim()) return "Give the survey a title.";
    if (index === 1 && startHour >= endHour) return "The day must end after it starts.";
    if (index === 2 && tags.length === 0) return "Add at least one interest for students to pick from.";
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

  function addTag() {
    const tag = tagInput.trim().slice(0, 30);
    setTagInput("");
    if (!tag) return;
    if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
    if (tags.length >= 30) return setError("A survey can have at most 30 interests.");
    setError("");
    setTags([...tags, tag]);
  }

  async function handleCreate() {
    // Check every step again, and go to the first one that needs fixing
    for (let i = 0; i < STEPS.length - 1; i++) {
      const problem = problemFor(i);
      if (problem) {
        setStepIndex(i);
        return setError(problem);
      }
    }

    setError("");
    setSending(true);
    try {
      const id = await sendSurvey(user, { title, description, tags, startHour, endHour });
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
          <p className="sv-sub">You can preview it as a student once it is created.</p>
        </div>
      </div>

      {stepIndex === 0 && (
        <section className="sv-card">
          <h2 className="sv-h2">The basics</h2>
          <p className="sv-hint">Students see the title and your message at the top of the survey.</p>
          <div className="sv-field">
            <label className="sv-label" htmlFor="survey-title">
              Title
            </label>
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
            <label className="sv-label" htmlFor="survey-description">
              Message to students (optional)
            </label>
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
          <h2 className="sv-h2">Hours students can choose from</h2>
          <p className="sv-hint">The calendar shows Monday to Sunday, between these hours.</p>
          <div className="sv-row">
            <select
              aria-label="First hour"
              className="sv-input"
              value={startHour}
              onChange={(e) => setStartHour(Number(e.target.value))}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
            <span>to</span>
            <select
              aria-label="Last hour"
              className="sv-input"
              value={endHour}
              onChange={(e) => setEndHour(Number(e.target.value))}
            >
              {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
          </div>
        </section>
      )}

      {stepIndex === 2 && (
        <section className="sv-card">
          <h2 className="sv-h2">Interests students can pick</h2>
          <p className="sv-hint">Click an interest to remove it. Add your own below.</p>
          <div className="sv-chips">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                className="sv-chip"
                aria-label={`Remove ${tag}`}
                title="Click to remove"
                onClick={() => setTags(tags.filter((t) => t !== tag))}
              >
                {tag} &times;
              </button>
            ))}
          </div>
          <div className="sv-row" style={{ marginTop: "0.75rem" }}>
            <input
              className="sv-input"
              style={{ flex: 1, minWidth: "9rem" }}
              value={tagInput}
              placeholder="Add an interest"
              aria-label="New interest"
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
            <button type="button" className="sv-btn" onClick={addTag}>
              Add
            </button>
          </div>
        </section>
      )}

      {isLast && (
        <section className="sv-card">
          <h2 className="sv-h2">Review</h2>
          <p className="sv-hint">Check the details. Students can see the survey as soon as you create it.</p>

          <div className="sv-review-row">
            <div>
              <h3 className="sv-review-title">Title</h3>
              <p className="sv-review-list">{title.trim()}</p>
              {description.trim() && <p className="sv-review-list sv-muted">{description.trim()}</p>}
            </div>
            <button type="button" className="sv-link-btn" onClick={() => setStepIndex(0)}>
              Edit<span className="sv-sr-only"> basics</span>
            </button>
          </div>

          <div className="sv-review-row">
            <div>
              <h3 className="sv-review-title">Hours</h3>
              <p className="sv-review-list">Monday to Sunday, {formatRange(startHour, endHour)}</p>
            </div>
            <button type="button" className="sv-link-btn" onClick={() => setStepIndex(1)}>
              Edit<span className="sv-sr-only"> hours</span>
            </button>
          </div>

          <div className="sv-review-row">
            <div>
              <h3 className="sv-review-title">Interests</h3>
              <p className="sv-review-list">{tags.join(", ")}</p>
            </div>
            <button type="button" className="sv-link-btn" onClick={() => setStepIndex(2)}>
              Edit<span className="sv-sr-only"> interests</span>
            </button>
          </div>
        </section>
      )}

      {error && (
        <p className="sv-error" role="alert">
          {error}
        </p>
      )}
    </Page>
  );
}
