import { useEffect, useState } from "react";
import AppShell, { Page } from "@utils/AppShell";
import SurveyFlow from "@survey/SurveyFlow";
import { watchOpenSurveys } from "@survey/surveyService";

export default function StudentSurveys({ user, profile }) {
  const [surveys, setSurveys] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  useEffect(
    () =>
      watchOpenSurveys(setSurveys, (err) =>
        setError("Could not load surveys: " + err.message),
      ),
    [],
  );

  const visibleSurveys = surveys?.filter(
    (s) =>
      !s.targetStudentUids ||
      s.targetStudentUids.length === 0 ||
      s.targetStudentUids.includes(user.uid),
  );

  const nav = [
    { id: "surveys", label: "Surveys", onSelect: () => setSelected(null) },
  ];

  return (
    <AppShell
      heading="Study groups"
      nav={nav}
      activeId="surveys"
      user={user}
      profile={profile}
    >
      {selected ? (
        <SurveyFlow
          key={selected.id}
          survey={selected}
          user={user}
          profile={profile}
          onExit={() => setSelected(null)}
        />
      ) : (
        <Page>
          <div className="sv-head">
            <div>
              <h1 className="sv-title">Surveys</h1>
              <p className="sv-sub">
                Fill out a survey so your instructor can match you with study
                partners.
              </p>
            </div>
          </div>

          {error && <p className="sv-error">{error}</p>}
          {visibleSurveys === null && !error && (
            <p className="sv-hint">Loading surveys...</p>
          )}
          {visibleSurveys?.length === 0 && (
            <p className="sv-hint">
              No surveys are open right now. Check back after your instructor
              sends one.
            </p>
          )}

          {visibleSurveys?.map((survey) => (
            <div key={survey.id} className="sv-card">
              <div className="sv-card-head">
                <div>
                  <h2 className="sv-h2">{survey.title}</h2>
                  {survey.description && (
                    <p className="sv-hint" style={{ margin: 0 }}>
                      {survey.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="sv-btn sv-btn-primary"
                  onClick={() => setSelected(survey)}
                >
                  Open survey
                </button>
              </div>
            </div>
          ))}
        </Page>
      )}
    </AppShell>
  );
}
