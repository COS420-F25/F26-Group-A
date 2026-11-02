import { useEffect, useState } from "react";
import {
  DEFAULT_TAGS,
  getResponses,
  sendSurvey,
  setSurveyStatus,
  watchMySurveys,
} from "./surveyService";
import { csvFileName, downloadCsv, responsesToCsv } from "./csv";
import { hourLabel } from "./slots";
import { styles } from "./ui";

// Instructor view: send a new survey, see the ones already sent, download answers.
export default function InstructorSurveys({ user }) {
  const [surveys, setSurveys] = useState(null); // null while loading
  const [error, setError] = useState("");

  useEffect(
    () => watchMySurveys(user.uid, setSurveys, (err) => setError("Could not load surveys: " + err.message)),
    [user.uid]
  );

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Surveys</h1>
      <p style={styles.muted}>Send a survey to your students and collect their availability and interests.</p>

      <SurveyBuilder user={user} />

      <h2 style={{ ...styles.subheading, marginTop: 32 }}>Sent surveys</h2>
      {error && <p style={styles.error}>{error}</p>}
      {surveys === null && !error && <p style={styles.muted}>Loading...</p>}
      {surveys?.length === 0 && <p style={styles.muted}>You have not sent a survey yet.</p>}
      {surveys?.map((survey) => (
        <SurveyCard key={survey.id} survey={survey} />
      ))}
    </div>
  );
}

function SurveyBuilder({ user }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState(DEFAULT_TAGS);
  const [tagInput, setTagInput] = useState("");
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(22);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  function addTag() {
    const tag = tagInput.trim().slice(0, 30);
    setTagInput("");
    if (!tag) return;
    if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
    if (tags.length >= 30) return setError("A survey can have at most 30 interests.");
    setTags([...tags, tag]);
  }

  async function handleSend(e) {
    e.preventDefault();
    setError("");
    setSent(false);

    if (!title.trim()) return setError("Give the survey a title.");
    if (tags.length === 0) return setError("Add at least one interest for students to pick from.");
    if (startHour >= endHour) return setError("The day must end after it starts.");

    setSending(true);
    try {
      await sendSurvey(user, { title, description, tags, startHour, endHour });
      setTitle("");
      setDescription("");
      setSent(true);
    } catch (err) {
      setError("Could not send the survey: " + err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSend} style={styles.card}>
      <h2 style={styles.subheading}>New survey</h2>

      <div style={styles.field}>
        <label style={styles.label} htmlFor="survey-title">Title</label>
        <input
          id="survey-title"
          style={styles.input}
          value={title}
          maxLength={120}
          placeholder="Week 1 study groups"
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label} htmlFor="survey-description">Message to students (optional)</label>
        <textarea
          id="survey-description"
          style={{ ...styles.input, minHeight: 64, resize: "vertical" }}
          value={description}
          maxLength={1000}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div style={styles.field}>
        <span style={styles.label}>Hours students can choose from</span>
        <div style={styles.row}>
          <select
            aria-label="First hour"
            style={styles.input}
            value={startHour}
            onChange={(e) => setStartHour(Number(e.target.value))}
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>{hourLabel(h)}</option>
            ))}
          </select>
          <span>to</span>
          <select
            aria-label="Last hour"
            style={styles.input}
            value={endHour}
            onChange={(e) => setEndHour(Number(e.target.value))}
          >
            {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
              <option key={h} value={h}>{hourLabel(h)}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.field}>
        <span style={styles.label}>Interests students can pick</span>
        <div style={styles.row}>
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              style={styles.chip}
              aria-label={`Remove ${tag}`}
              title="Click to remove"
              onClick={() => setTags(tags.filter((t) => t !== tag))}
            >
              {tag} &times;
            </button>
          ))}
        </div>
        <div style={{ ...styles.row, marginTop: 8 }}>
          <input
            style={{ ...styles.input, flex: 1, minWidth: 140 }}
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
          <button type="button" style={styles.button} onClick={addTag}>Add</button>
        </div>
      </div>

      {error && <p style={styles.error}>{error}</p>}
      {sent && <p style={styles.success}>Survey sent. Students can see it now.</p>}

      <button type="submit" style={styles.primaryButton} disabled={sending}>
        {sending ? "Sending..." : "Send to students"}
      </button>
    </form>
  );
}

function SurveyCard({ survey }) {
  const [responses, setResponses] = useState(null); // null = not loaded
  const [showing, setShowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isOpen = survey.status === "open";
  const sentOn = survey.createdAt?.toDate ? survey.createdAt.toDate().toLocaleDateString() : "just now";

  async function loadResponses() {
    setError("");
    setBusy(true);
    try {
      const list = await getResponses(survey.id);
      setResponses(list);
      return list;
    } catch (err) {
      setError("Could not load responses: " + err.message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function toggleResponses() {
    const next = !showing;
    setShowing(next);
    if (next) await loadResponses();
  }

  async function handleDownload() {
    const list = await loadResponses();
    if (list) downloadCsv(csvFileName(survey.title), responsesToCsv(list));
  }

  async function toggleStatus() {
    setError("");
    try {
      await setSurveyStatus(survey.id, isOpen ? "closed" : "open");
    } catch (err) {
      setError("Could not change the survey: " + err.message);
    }
  }

  return (
    <div style={styles.card}>
      <div style={styles.spread}>
        <div>
          <h3 style={styles.subheading}>{survey.title}</h3>
          <p style={{ ...styles.muted, marginBottom: 8 }}>
            Sent {sentOn} &middot; {hourLabel(survey.startHour)} to {hourLabel(survey.endHour)} &middot;{" "}
            {survey.tags.length} interests
          </p>
        </div>
        <span style={styles.badge}>{isOpen ? "Open" : "Closed"}</span>
      </div>

      <div style={styles.row}>
        <button style={styles.button} onClick={toggleResponses} disabled={busy}>
          {showing ? "Hide responses" : "View responses"}
        </button>
        <button style={styles.button} onClick={handleDownload} disabled={busy}>
          Download CSV
        </button>
        <button style={styles.button} onClick={toggleStatus}>
          {isOpen ? "Close survey" : "Reopen survey"}
        </button>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      {showing && responses && (
        <div style={{ marginTop: 12, overflowX: "auto" }}>
          {responses.length === 0 ? (
            <p style={styles.muted}>No answers yet.</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Student</th>
                  <th style={styles.th}>Interests</th>
                  <th style={styles.th}>Hours free</th>
                </tr>
              </thead>
              <tbody>
                {responses.map((r) => (
                  <tr key={r.uid}>
                    <td style={styles.td}>{r.name || r.email}</td>
                    <td style={styles.td}>{(r.tags ?? []).join(", ")}</td>
                    <td style={styles.td}>{(r.availability ?? []).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button style={{ ...styles.button, marginTop: 8 }} onClick={loadResponses} disabled={busy}>
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}
