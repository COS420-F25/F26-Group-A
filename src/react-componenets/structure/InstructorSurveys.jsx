import { useEffect, useState } from "react";
import AppShell, { Page } from "./AppShell";
import SurveyBuilder from "./SurveyBuilder";
import SurveyDetail from "../content/SurveyDetail";
import SurveyFlow from "./SurveyFlow";
import { watchMySurveys } from "../utils/surveyService";
import { useHashRoute } from "../useHashRoute";
import { formatRange } from "../utils/slots";

// The sidebar. "Create survey" lives in the Surveys sub menu.
const NAV = [
  {
    id: "surveys-menu",
    label: "Surveys",
    children: [
      { id: "surveys", label: "Sent surveys", href: "#surveys" },
      { id: "create", label: "Create survey", href: "#create" },
    ],
  },
];

// Instructor view. The screen is picked by the URL hash:
//   #surveys              sent surveys (the default)
//   #create               create a survey, step by step
//   #survey/<id>          one survey: progress, sharing, answers
//   #survey/<id>/preview  walk through the survey as a student
export default function InstructorSurveys({ user, profile }) {
  const [surveys, setSurveys] = useState(null); // null while loading
  const [error, setError] = useState("");
  const [justCreatedId, setJustCreatedId] = useState(null);
  const [route, navigate] = useHashRoute("surveys");

  useEffect(
    () => watchMySurveys(user.uid, setSurveys, (err) => setError("Could not load surveys: " + err.message)),
    [user.uid]
  );

  const [section, surveyId, subpage] = route.split("/");
  const survey = section === "survey" ? surveys?.find((s) => s.id === surveyId) : undefined;

  let activeId = "surveys";
  let page;

  if (route === "create") {
    activeId = "create";
    page = (
      <SurveyBuilder
        user={user}
        onCancel={() => navigate("surveys")}
        onCreated={(id) => {
          setJustCreatedId(id);
          navigate(`survey/${id}`);
        }}
      />
    );
  } else if (section === "survey" && surveyId) {
    if (survey && subpage === "preview") {
      page = (
        <SurveyFlow
          survey={survey}
          user={user}
          profile={profile}
          preview
          onExit={() => navigate(`survey/${surveyId}`)}
        />
      );
    } else if (survey) {
      page = (
        <SurveyDetail
          key={survey.id}
          survey={survey}
          justCreated={justCreatedId === survey.id}
          onPreview={() => {
            setJustCreatedId(null);
            navigate(`survey/${survey.id}/preview`);
          }}
        />
      );
    } else {
      page = (
        <Page>
          {surveys === null && !error ? (
            <p className="sv-hint">Loading...</p>
          ) : (
            <p className="sv-hint">
              We could not find that survey. <a href="#surveys">Back to sent surveys</a>
            </p>
          )}
          {error && <p className="sv-error">{error}</p>}
        </Page>
      );
    }
  } else {
    page = (
      <Page>
        <div className="sv-head">
          <div>
            <h1 className="sv-title">Sent surveys</h1>
            <p className="sv-sub">Open a survey to see who has answered, share it, or preview it.</p>
          </div>
          <a className="sv-btn sv-btn-primary" href="#create">
            Create survey
          </a>
        </div>

        {error && <p className="sv-error">{error}</p>}
        {surveys === null && !error && <p className="sv-hint">Loading...</p>}
        {surveys?.length === 0 && <p className="sv-hint">You have not sent a survey yet.</p>}

        {surveys?.map((s) => {
          const isOpen = s.status === "open";
          const sentOn = s.createdAt?.toDate ? s.createdAt.toDate().toLocaleDateString() : "just now";
          const questionCount = s.questions?.length ?? s.tags?.length ?? 0;
          const targetLabel =
            s.targetStudentUids && s.targetStudentUids.length > 0
              ? `${s.targetStudentUids.length} targeted student${s.targetStudentUids.length === 1 ? "" : "s"}`
              : "All students";

          return (
            <div key={s.id} className="sv-card">
              <div className="sv-card-head">
                <h2 className="sv-h2">{s.title}</h2>
                <span className={isOpen ? "sv-badge sv-badge-open" : "sv-badge"}>{isOpen ? "Open" : "Closed"}</span>
              </div>
              <p className="sv-hint">
                Sent {sentOn} &middot; {formatRange(s.startHour, s.endHour)} &middot; {questionCount} questions &middot; {targetLabel}
              </p>
              <a className="sv-btn sv-btn-sm" href={`#survey/${s.id}`}>
                View survey<span className="sv-sr-only">: {s.title}</span>
              </a>
            </div>
          );
        })}
      </Page>
    );
  }

  return (
    <AppShell heading="Study groups" nav={NAV} activeId={activeId} user={user} profile={profile}>
      {page}
    </AppShell>
  );
}
