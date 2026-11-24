import RoleGate from "../RoleGate";
import InstructorSurveys from "@survey/InstructorSurveys";
import StudentSurveys from "@survey/StudentSurveys";

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
