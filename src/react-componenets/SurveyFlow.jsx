import { useEffect, useRef, useState } from "react";
import AvailabilityGrid from "./AvailabilityGrid";
import BlockListStep from "./BlockListStep";
import { ActionBar, Page } from "./AppShell";
import { getMyResponse, saveResponse } from "./surveyService";
import { summarizeSlots } from "./slots";

// The steps a student goes through, in order.
// The last step (review) is not counted as a question.
const STEPS = [
  { id: "interests", label: "Interests & About You" },
  { id: "availability", label: "Availability" },
  { id: "blocklist", label: "Block list" },
  { id: "review", label: "Review" },
];
const QUESTION_COUNT = STEPS.length - 1;

const GENDER_OPTIONS = ["Woman", "Man", "Non-binary", "Prefer not to say"];

// Returns a message if this step is not filled in, or null if it is fine
function problemFor(stepId, availability, ifNeededAvailability, tags, gender) {
  if (stepId === "interests") {
    if (tags.size === 0) return "Pick at least one interest.";
    if (!gender.trim()) return "Please select or enter your gender.";
  }
  if (stepId === "availability" && availability.size === 0 && ifNeededAvailability.size === 0) {
    return "Mark at least one hour when you are free (or available if needed).";
  }
  return null;
}

// Finds the first step that is not filled in
function firstProblem(availability, ifNeededAvailability, tags, gender) {
  for (let index = 0; index < STEPS.length; index++) {
    const text = problemFor(STEPS[index].id, availability, ifNeededAvailability, tags, gender);
    if (text) return { index, text };
  }
  return null;
}

function toggled(set, item) {
  const next = new Set(set);
  if (!next.delete(item)) next.add(item);
  return next;
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
      <rect x="4" y="9" width="12" height="8" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 9V6.5a3 3 0 016 0V9" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

// One survey, one step at a time: interests & gender, availability, block list, review.
//
// preview  true when an instructor is looking at it. Nothing is loaded or saved.
// onExit   called when the person leaves the survey
export default function SurveyFlow({ survey, user, profile, preview = false, onExit }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [availability, setAvailability] = useState(new Set());
  const [ifNeededAvailability, setIfNeededAvailability] = useState(new Set());
  const [tags, setTags] = useState(new Set());
  const [gender, setGender] = useState("");
  const [mode, setMode] = useState("paint");
  const [loading, setLoading] = useState(!preview);
  const [hadResponse, setHadResponse] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState(null); // { type: "error" | "success", text }

  const headingRef = useRef(null);
  const firstRender = useRef(true);

  const step = STEPS[stepIndex];
  const isReview = step.id === "review";

  // If the student answered before, show their old answers so they can change them
  useEffect(() => {
    if (preview) return undefined;
    let cancelled = false;
    getMyResponse(survey.id, user.uid)
      .then((old) => {
        if (cancelled) return;
        if (old) {
          setAvailability(new Set(old.availability ?? []));
          setIfNeededAvailability(new Set(old.ifNeededAvailability ?? []));
          setTags(new Set(old.tags ?? []));
          setGender(old.gender ?? "");
          setHadResponse(true);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setNotice({ type: "error", text: "Could not load your earlier answers: " + err.message });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [preview, survey.id, user?.uid]);

  // Move keyboard focus to the new question when the step changes
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [stepIndex]);

  // Editing after a save means the saved message is out of date
  function markEdited() {
    setSaved(false);
    setNotice((current) => (current?.type === "success" ? null : current));
  }

  function changeAvailability(next) {
    markEdited();
    setAvailability(next);
  }

  function changeIfNeededAvailability(next) {
    markEdited();
    setIfNeededAvailability(next);
  }

  function toggleTag(tag) {
    markEdited();
    setTags((current) => toggled(current, tag));
  }

  function changeGender(nextGender) {
    markEdited();
    setGender(nextGender);
  }

  function jumpTo(index) {
    markEdited();
    setStepIndex(index);
  }

  function goNext() {
    const text = problemFor(step.id, availability, ifNeededAvailability, tags, gender);
    if (text) return setNotice({ type: "error", text });
    setNotice(null);
    setStepIndex(stepIndex + 1);
  }

  function goBack() {
    if (stepIndex === 0) return onExit?.();
    setNotice(null);
    setStepIndex(stepIndex - 1);
  }

  async function handleSubmit() {
    const problem = firstProblem(availability, ifNeededAvailability, tags, gender);
    if (problem) {
      setStepIndex(problem.index);
      return setNotice({ type: "error", text: problem.text });
    }

    setNotice(null);
    setSaving(true);
    try {
      await saveResponse(survey.id, user, profile, {
        availability: [...availability],
        ifNeededAvailability: [...ifNeededAvailability],
        // Keep the instructor's order and drop anything that is not an option
        tags: survey.tags.filter((tag) => tags.has(tag)),
        gender: gender.trim(),
      });
      setHadResponse(true);
      setSaved(true);
      setNotice({
        type: "success",
        text: "Your answers are saved. You can change them until the survey closes.",
      });
    } catch (err) {
      setNotice({
        type: "error",
        text:
          err.code === "permission-denied"
            ? "This survey is closed, so your answers were not saved."
            : "Could not save your answers: " + err.message,
      });
    } finally {
      setSaving(false);
    }
  }

  // ----- Buttons in the bottom bar -----

  let backLabel = "Back";
  if (stepIndex === 0) backLabel = preview ? "Exit preview" : "Back to surveys";

  let primary;
  if (!isReview) {
    primary = (
      <button type="button" className="sv-btn sv-btn-primary" onClick={goNext}>
        {stepIndex === QUESTION_COUNT - 1 ? "Review answers" : "Continue"}
      </button>
    );
  } else if (preview) {
    primary = (
      <button type="button" className="sv-btn sv-btn-primary" onClick={onExit}>
        Exit preview
      </button>
    );
  } else if (saved) {
    primary = (
      <button type="button" className="sv-btn sv-btn-primary" onClick={onExit}>
        Back to surveys
      </button>
    );
  } else {
    primary = (
      <button type="button" className="sv-btn sv-btn-primary" onClick={handleSubmit} disabled={saving}>
        {saving ? "Saving..." : hadResponse ? "Save changes" : "Submit survey"}
      </button>
    );
  }

  const footer = (
    <ActionBar
      note={preview ? "Preview only. Nothing here is saved." : "You can change your answers until the survey closes."}
    >
      {!(isReview && saved && !preview) && (
        <button type="button" className="sv-btn" onClick={goBack}>
          {backLabel}
        </button>
      )}
      {primary}
    </ActionBar>
  );

  const isCustomGender = gender !== "" && !GENDER_OPTIONS.includes(gender);

  // ----- The page -----

  return (
    <Page footer={footer}>
      <div className="sv-head">
        <div>
          <h1 className="sv-title">{survey.title}</h1>
          <p className="sv-sub">About 2 minutes</p>
        </div>
        <p className="sv-step-count">{isReview ? "Review" : `Question ${stepIndex + 1} of ${QUESTION_COUNT}`}</p>
      </div>
      {survey.description && <p className="sv-sub" style={{ marginBottom: "1rem" }}>{survey.description}</p>}

      <ol className="sv-steps" aria-label="Survey progress">
        {STEPS.map((s, i) => (
          <li
            key={s.id}
            data-state={i < stepIndex ? "done" : i === stepIndex ? "current" : undefined}
            aria-current={i === stepIndex ? "step" : undefined}
          >
            <span className="sv-sr-only">{s.label}</span>
          </li>
        ))}
      </ol>

      {preview && (
        <div className="sv-banner" role="note">
          Preview: this is what students see. Click through the steps. Nothing is saved.
        </div>
      )}
      <div className="sv-banner">
        <LockIcon />
        Only your instructor sees your answers. Classmates never do.
      </div>
      {hadResponse && !saved && (
        <p className="sv-hint">You already answered this survey. You can change your answers and save again.</p>
      )}

      {loading ? (
        <p className="sv-hint">Loading...</p>
      ) : (
        <>
          {step.id === "interests" && (
            <section className="sv-card">
              <h2 className="sv-h2" ref={headingRef} tabIndex={-1}>
                What are you interested in?
              </h2>
              <p className="sv-hint">Pick any.</p>
              <div className="sv-chips" style={{ marginBottom: "1.5rem" }}>
                {survey.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="sv-chip"
                    aria-pressed={tags.has(tag)}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <h3 className="sv-h2">What is your gender?</h3>
              <p className="sv-hint">Used only to help form balanced study groups.</p>
              <div className="sv-chips" role="group" aria-label="Gender">
                {GENDER_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className="sv-chip"
                    aria-pressed={gender === opt}
                    onClick={() => changeGender(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <div className="sv-field" style={{ marginTop: "0.75rem", marginBottom: 0 }}>
                <label className="sv-label" htmlFor="survey-gender-custom">
                  Or self-describe
                </label>
                <input
                  id="survey-gender-custom"
                  type="text"
                  className="sv-input"
                  placeholder="Enter gender identity"
                  value={isCustomGender ? gender : ""}
                  onChange={(e) => changeGender(e.target.value)}
                />
              </div>
            </section>
          )}

          {step.id === "availability" && (
            <section className="sv-card">
              <h2 className="sv-h2" ref={headingRef} tabIndex={-1}>
                When can you meet for about an hour each week?
              </h2>
              <p className="sv-hint">
                Click or drag to mark hours you are free ({availability.size} selected) or available if needed ({ifNeededAvailability.size} selected).
              </p>
              <div className="sv-toolbar">
                <div className="sv-seg" role="group" aria-label="Calendar mode">
                  <button
                    type="button"
                    className="sv-btn sv-btn-sm"
                    aria-pressed={mode === "paint"}
                    onClick={() => setMode("paint")}
                  >
                    Available
                  </button>
                  <button
                    type="button"
                    className="sv-btn sv-btn-sm sv-btn-if-needed"
                    aria-pressed={mode === "if-needed"}
                    onClick={() => setMode("if-needed")}
                  >
                    If needed
                  </button>
                  <button
                    type="button"
                    className="sv-btn sv-btn-sm"
                    aria-pressed={mode === "erase"}
                    onClick={() => setMode("erase")}
                  >
                    Erase
                  </button>
                </div>
                <button
                  type="button"
                  className="sv-link-btn"
                  onClick={() => {
                    changeAvailability(new Set());
                    changeIfNeededAvailability(new Set());
                  }}
                >
                  Clear all
                </button>
              </div>
              <AvailabilityGrid
                startHour={survey.startHour}
                endHour={survey.endHour}
                value={availability}
                onChange={changeAvailability}
                ifNeededValue={ifNeededAvailability}
                onIfNeededChange={changeIfNeededAvailability}
                mode={mode}
              />
              <div className="sv-legend">
                <span>
                  <i className="sv-swatch sv-swatch-on" />
                  Available
                </span>
                <span>
                  <i className="sv-swatch sv-swatch-if-needed" />
                  If needed
                </span>
                <span>
                  <i className="sv-swatch" />
                  Not available
                </span>
              </div>
            </section>
          )}

          {step.id === "blocklist" && <BlockListStep />}

          {isReview && (
            <section className="sv-card">
              <h2 className="sv-h2" ref={headingRef} tabIndex={-1}>
                Review your answers
              </h2>

              <div className="sv-review-row">
                <div>
                  <h3 className="sv-review-title">Interests &amp; About You</h3>
                  <p className="sv-review-list">
                    <strong>Interests:</strong> {survey.tags.filter((tag) => tags.has(tag)).join(", ")}
                  </p>
                  <p className="sv-review-list">
                    <strong>Gender:</strong> {gender}
                  </p>
                </div>
                <button type="button" className="sv-link-btn" onClick={() => jumpTo(0)}>
                  Edit
                  <span className="sv-sr-only"> interests and gender</span>
                </button>
              </div>

              <div className="sv-review-row">
                <div>
                  <h3 className="sv-review-title">When you can meet</h3>
                  {availability.size > 0 && (
                    <ul className="sv-review-list">
                      {summarizeSlots([...availability]).map(({ day, ranges }) => (
                        <li key={day}>
                          <strong>{day}:</strong> {ranges.join(", ")}
                        </li>
                      ))}
                    </ul>
                  )}
                  {ifNeededAvailability.size > 0 && (
                    <div style={{ marginTop: availability.size > 0 ? "0.4rem" : 0 }}>
                      <p className="sv-review-list sv-muted">
                        <strong>If needed:</strong>
                      </p>
                      <ul className="sv-review-list">
                        {summarizeSlots([...ifNeededAvailability]).map(({ day, ranges }) => (
                          <li key={day}>
                            <strong>{day}:</strong> {ranges.join(", ")}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <button type="button" className="sv-link-btn" onClick={() => jumpTo(1)}>
                  Edit
                  <span className="sv-sr-only"> availability</span>
                </button>
              </div>
            </section>
          )}

          {notice && (
            <p className={notice.type === "error" ? "sv-error" : "sv-success"} role={notice.type === "error" ? "alert" : "status"}>
              {notice.text}
            </p>
          )}
        </>
      )}
    </Page>
  );
}
