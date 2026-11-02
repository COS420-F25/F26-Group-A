import RoleGate from "./RoleGate";
import InstructorSurveys from "./InstructorSurveys";
import StudentSurveys from "./StudentSurveys";

// The /survey page. Instructors see the sending tools, students see the survey form.
export default function SurveyPage() {
  return (
    <RoleGate>
      {({ user, profile }) =>
        profile.role === "instructor" ? (
          <InstructorSurveys user={user} profile={profile} />
        ) : (
          <StudentSurveys user={user} profile={profile} />
        )
      }
    </RoleGate>
  );
}
