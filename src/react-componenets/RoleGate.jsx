import { useUserProfile } from "./useUserProfile";
import { styles } from "./ui";

function Notice({ children }) {
  return (
    <div style={styles.page}>
      <p style={styles.muted}>{children}</p>
    </div>
  );
}

// Only shows its children to signed-in users who have a role.
//
//   <RoleGate>...</RoleGate>                        any signed-in user
//   <RoleGate allow="instructor">...</RoleGate>     instructors only
//   <RoleGate allow={["student", "instructor"]}>    either role
//
// The children can be a function that receives { user, profile }:
//   <RoleGate>{({ user, profile }) => <Page user={user} />}</RoleGate>
//
// This hides pages in the browser. The Firestore rules are what
// actually protect the data.
export default function RoleGate({ allow, children }) {
  const { user, profile, loading, error } = useUserProfile();

  if (loading) return <Notice>Loading...</Notice>;
  if (!user) return <Notice>Sign in to see this page.</Notice>;
  if (error) return <Notice>Could not load your account. Try refreshing the page.</Notice>;
  if (!profile) {
    return <Notice>Choose your role with the button at the top right to finish setting up your account.</Notice>;
  }

  const allowed = allow ? [].concat(allow) : null;
  if (allowed && !allowed.includes(profile.role)) {
    return <Notice>This page is only for {allowed.join(" and ")} accounts.</Notice>;
  }

  return typeof children === "function" ? children({ user, profile }) : children;
}
