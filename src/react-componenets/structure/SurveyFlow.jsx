import { useEffect, useRef, useState } from "react";
import AvailabilityGrid from "../content/AvailabilityGrid";
import BlockListStep from "../content/BlockListStep";
import { ActionBar, Page } from "./AppShell";
import { getMyResponse, saveResponse } from "../utils/surveyService";

const GENDER_OPTIONS = ["Woman", "Man", "Non-binary", "Prefer not to say"];
const DEFAULT_INTERESTS = ["Math", "Programming", "Science", "Writing", "Engineering", "Design"];

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
      <rect x="4" y="9" width="12" height="8" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 9V6.5a3 3 0 016 0V9" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export default function SurveyFlow({ survey, user, profile, preview = false, onExit }) {
  const allQuestions = survey.questions || [];

  // Group and sort general questions so Gender & Interests appear together on Step 1 in order
  const generalQuestions = [...allQuestions].sort((a, b) => {
    const order = { gender: 1, interests: 2, text: 3, choice: 4 };
    return (order[a.type] || 99) - (order[b.type] || 99);
  }).filter((q) => q.type !== "availability" && q.type !== "blocklist");

  const availabilityQ = allQuestions.find((q) => q.type === "availability");
  const blocklistQ = allQuestions.find((q) => q.type === "blocklist");

  // Build ordered flow steps matching the student experience
  const STEPS = [];
  if (generalQuestions.length > 0) {
    STEPS.push({ id: "general", label: "About You & Preferences", questions: generalQuestions });
  }
  if (availabilityQ) {
    STEPS.push({ id: "availability", label: availabilityQ.label || "Availability", q: availabilityQ });
  }
  if (blocklistQ) {
    STEPS.push({ id: "blocklist", label: blocklistQ.label || "Block list", q: blocklistQ });
  }
  STEPS.push({ id: "review", label: "Review" });

  const QUESTION_STEP_COUNT = STEPS.length - 1;

  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [mode, setMode] = useState("paint");
  const [loading, setLoading] = useState(!preview);
  const [hadResponse, setHadResponse] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState(null);

  const headingRef = useRef(null);
  const firstRender = useRef(true);

  const step = STEPS[stepIndex];
  const isReview = step?.id === "review";

  useEffect(() => {
    if (preview) return undefined;
    let cancelled = false;
    getMyResponse(survey.id, user.uid)
      .then((old) => {
        if (cancelled) return;
        if (old?.answers) {
          setAnswers(old.answers);
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

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [stepIndex]);

  function markEdited() {
    setSaved(false);
    setNotice((current) => (current?.type === "success" ? null : current));
  }

  function setAnswerFor(qId, val) {
    markEdited();
    setAnswers((prev) => ({ ...prev, [qId]: val }));
  }

  function jumpToStepById(stepId) {
    markEdited();
    const idx = STEPS.findIndex((s) => s.id === stepId);
    if (idx !== -1) setStepIndex(idx);
  }

  function goNext() {
    setNotice(null);
    setStepIndex(stepIndex + 1);
  }

  function goBack() {
    if (stepIndex === 0) return onExit?.();
    setNotice(null);
    setStepIndex(stepIndex - 1);
  }

  async function handleSubmit() {
    setNotice(null);
    setSaving(true);
    try {
      await saveResponse(survey.id, user, profile, answers);
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

  function renderGeneralQuestion(q) {
    return (
      <div key={q.id} style={{ marginBottom: "1.75rem" }}>
        <h3 className="sv-h2" style={{ fontSize: "1.05rem", marginBottom: "0.35rem" }}>
          {q.label}
        </h3>

        {q.type === "text" && (
          <input
            className="sv-input"
            value={answers[q.id] || ""}
            onChange={(e) => setAnswerFor(q.id, e.target.value)}
            placeholder="Your answer"
          />
        )}

        {q.type === "choice" && (
          <div className="sv-chips">
            {(q.options || []).map((opt) => (
              <button
                key={opt}
                type="button"
                className="sv-chip"
                aria-pressed={answers[q.id] === opt}
                onClick={() => setAnswerFor(q.id, opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {q.type === "interests" && (
          <div>
            <p className="sv-hint">Select your topics and interests below (click to toggle).</p>
            <div className="sv-chips" style={{ marginTop: "0.5rem" }}>
              {DEFAULT_INTERESTS.map((tag) => {
                const currentSet = new Set(answers[q.id] || []);
                const isPressed = currentSet.has(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    className="sv-chip"
                    aria-pressed={isPressed}
                    onClick={() => {
                      const nextSet = new Set(currentSet);
                      if (isPressed) nextSet.delete(tag);
                      else nextSet.add(tag);
                      setAnswerFor(q.id, [...nextSet]);
                    }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {q.type === "gender" && (
          <div className="sv-chips">
            {GENDER_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                className="sv-chip"
                aria-pressed={answers[q.id] === opt}
                onClick={() => setAnswerFor(q.id, opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  let backLabel = "Back";
  if (stepIndex === 0) backLabel = preview ? "Exit preview" : "Back to surveys";

  let primary;
  if (!isReview) {
    primary = (
      <button type="button" className="sv-btn sv-btn-primary" onClick={goNext}>
        {stepIndex === QUESTION_STEP_COUNT - 1 ? "Review answers" : "Continue"}
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

  // Flatten the review items to match the exact step and question order shown in the wizard
  const reviewItems = [];
  if (generalQuestions.length > 0) {
    generalQuestions.forEach((q) => reviewItems.push({ q, stepId: "general" }));
  }
  if (availabilityQ) {
    reviewItems.push({ q: availabilityQ, stepId: "availability" });
  }
  if (blocklistQ) {
    reviewItems.push({ q: blocklistQ, stepId: "blocklist" });
  }

  return (
    <Page footer={footer}>
      <div className="sv-head">
        <div>
          <h1 className="sv-title">{survey.title}</h1>
          <p className="sv-sub">About 2 minutes</p>
        </div>
        <p className="sv-step-count">
          {isReview ? "Review" : `Step ${stepIndex + 1} of ${QUESTION_STEP_COUNT}`}
        </p>
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
          {step?.id === "general" && (
            <section className="sv-card">
              <h2 className="sv-h2" ref={headingRef} tabIndex={-1} style={{ marginBottom: "1rem" }}>
                About You & Preferences
              </h2>
              {step.questions.map((q) => renderGeneralQuestion(q))}
            </section>
          )}

          {step?.id === "availability" && step.q && (
            <section className="sv-card">
              <h2 className="sv-h2" ref={headingRef} tabIndex={-1}>
                {step.q.label}
              </h2>
              <p className="sv-hint">Paint standard available times (solid) or secondary if-needed times (dashed).</p>
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
                    className="sv-btn sv-btn-sm"
                    aria-pressed={mode === "ifNeeded"}
                    onClick={() => setMode("ifNeeded")}
                  >
                    If Needed
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
                  onClick={() => setAnswerFor(step.q.id, { available: [], ifNeeded: [] })}
                >
                  Clear all
                </button>
              </div>
              <AvailabilityGrid
                startHour={survey.startHour}
                endHour={survey.endHour}
                value={new Set(answers[step.q.id]?.available || (Array.isArray(answers[step.q.id]) ? answers[step.q.id] : []))}
                ifNeededValue={new Set(answers[step.q.id]?.ifNeeded || [])}
                onChange={(nextAvail, nextIfNeeded) =>
                  setAnswerFor(step.q.id, { available: [...nextAvail], ifNeeded: [...nextIfNeeded] })
                }
                mode={mode}
              />
              <div className="sv-legend">
                <span><i className="sv-swatch sv-swatch-on" /> Available</span>
                <span><i className="sv-swatch" style={{ border: "2px dashed var(--sv-accent)" }} /> If Needed</span>
                <span><i className="sv-swatch" /> Not available</span>
              </div>
            </section>
          )}

          {step?.id === "blocklist" && <BlockListStep />}

          {isReview && (
            <section className="sv-card">
              <h2 className="sv-h2" ref={headingRef} tabIndex={-1}>
                Review your answers
              </h2>

              {reviewItems.map(({ q, stepId }) => {
                const ans = answers[q.id];
                let displayVal = "No answer given";

                if (q.type === "availability") {
                  const availSlots = ans?.available || (Array.isArray(ans) ? ans : []);
                  const neededSlots = ans?.ifNeeded || [];
                  displayVal = (
                    <div>
                      <AvailabilityGrid
                        startHour={survey.startHour}
                        endHour={survey.endHour}
                        value={new Set(availSlots)}
                        ifNeededValue={new Set(neededSlots)}
                        onChange={() => {}}
                        disabled={true}
                      />
                      <div className="sv-legend" style={{ marginTop: "0.5rem" }}>
                        <span><i className="sv-swatch sv-swatch-on" /> Available ({availSlots.length})</span>
                        <span><i className="sv-swatch" style={{ border: "2px dashed var(--sv-accent)" }} /> If Needed ({neededSlots.length})</span>
                      </div>
                    </div>
                  );
                } else if (Array.isArray(ans)) {
                  displayVal = ans.join(", ") || "None selected";
                } else if (ans) {
                  displayVal = String(ans);
                }

                return (
                  <div key={q.id} className="sv-review-row">
                    <div>
                      <h3 className="sv-review-title">{q.label}</h3>
                      <div className="sv-review-list">{displayVal}</div>
                    </div>
                    <button type="button" className="sv-link-btn" onClick={() => jumpToStepById(stepId)}>
                      Edit<span className="sv-sr-only"> {q.label}</span>
                    </button>
                  </div>
                );
              })}
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
