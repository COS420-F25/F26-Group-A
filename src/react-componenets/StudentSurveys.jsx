import { useEffect, useState } from "react";
import AvailabilityGrid from "./AvailabilityGrid";
import { getMyResponse, saveResponse, watchOpenSurveys } from "./surveyService";
import { hourLabel } from "./slots";
import { styles } from "./ui";

// Student view: a list of open surveys, and the form for the one they pick.
export default function StudentSurveys({ user, profile }) {
  const [surveys, setSurveys] = useState(null); // null while loading
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState("");

  useEffect(
    () => watchOpenSurveys(setSurveys, (err) => setError("Could not load surveys: " + err.message)),
    []
  );

  const selected = surveys?.find((s) => s.id === selectedId);

  if (selected) {
    return (
      <div style={styles.page}>
        <SurveyForm
          key={selected.id}
          survey={selected}
          user={user}
          profile={profile}
          onBack={() => setSelectedId(null)}
        />
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Surveys</h1>
      <p style={styles.muted}>Fill out a survey so your instructor can match you with study partners.</p>

      {error && <p style={styles.error}>{error}</p>}
      {surveys === null && !error && <p style={styles.muted}>Loading surveys...</p>}
      {surveys?.length === 0 && (
        <p style={styles.muted}>No surveys are open right now. Check back after your instructor sends one.</p>
      )}

      {surveys?.map((survey) => (
        <div key={survey.id} style={styles.card}>
          <div style={styles.spread}>
            <div>
              <h2 style={styles.subheading}>{survey.title}</h2>
              {survey.description && <p style={styles.muted}>{survey.description}</p>}
            </div>
            <button style={styles.primaryButton} onClick={() => setSelectedId(survey.id)}>
              Open survey
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SurveyForm({ survey, user, profile, onBack }) {
  const [availability, setAvailability] = useState(new Set());
  const [tags, setTags] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [hadResponse, setHadResponse] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // If the student answered before, show their old answers so they can change them
  useEffect(() => {
    let cancelled = false;
    getMyResponse(survey.id, user.uid)
      .then((old) => {
        if (cancelled) return;
        if (old) {
          setAvailability(new Set(old.availability ?? []));
          setTags(new Set(old.tags ?? []));
          setHadResponse(true);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError("Could not load your earlier answers: " + err.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [survey.id, user.uid]);

  function changeAvailability(next) {
    setSaved(false);
    setAvailability(next);
  }

  function toggleTag(tag) {
    setSaved(false);
    setTags((current) => {
      const next = new Set(current);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaved(false);

    if (availability.size === 0) return setError("Mark at least one hour when you are free.");
    if (tags.size === 0) return setError("Pick at least one interest.");

    setSaving(true);
    try {
      await saveResponse(survey.id, user, profile, {
        availability: [...availability],
        // Keep the instructor's order and drop anything that is not an option
        tags: survey.tags.filter((tag) => tags.has(tag)),
      });
      setSaved(true);
      setHadResponse(true);
    } catch (err) {
      setError(
        err.code === "permission-denied"
          ? "This survey is closed, so your answers were not saved."
          : "Could not save your answers: " + err.message
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <button type="button" style={{ ...styles.button, marginBottom: 16 }} onClick={onBack}>
        Back to surveys
      </button>

      <h1 style={styles.heading}>{survey.title}</h1>
      {survey.description && <p style={styles.muted}>{survey.description}</p>}
      {hadResponse && !saved && (
        <p style={styles.muted}>You already answered this survey. You can change your answers and save again.</p>
      )}

      {loading ? (
        <p style={styles.muted}>Loading...</p>
      ) : (
        <>
          <div style={styles.card}>
            <h2 style={styles.subheading}>When are you free?</h2>
            <p style={styles.muted}>
              Click or drag to mark the hours you can study. {availability.size} selected.
            </p>
            <AvailabilityGrid
              startHour={survey.startHour}
              endHour={survey.endHour}
              value={availability}
              onChange={changeAvailability}
            />
            <button
              type="button"
              style={{ ...styles.button, marginTop: 12 }}
              onClick={() => changeAvailability(new Set())}
            >
              Clear all
            </button>
          </div>

          <div style={styles.card}>
            <h2 style={styles.subheading}>What are you interested in?</h2>
            <p style={styles.muted}>Pick all that apply.</p>
            <div style={styles.row}>
              {survey.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={tags.has(tag)}
                  style={tags.has(tag) ? styles.chipOn : styles.chip}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {error && <p style={styles.error}>{error}</p>}
          {saved && (
            <p style={styles.success}>Your answers are saved. You can change them until the survey closes.</p>
          )}

          <button type="submit" style={styles.primaryButton} disabled={saving}>
            {saving ? "Saving..." : hadResponse ? "Save changes" : "Submit survey"}
          </button>
          <p style={{ ...styles.muted, marginTop: 8 }}>
            Hours shown: {hourLabel(survey.startHour)} to {hourLabel(survey.endHour)}
          </p>
        </>
      )}
    </form>
  );
}
