import { useState } from "react";
import AppShell from "./AppShell";
import ReviewGroups from "../content/ReviewGroups";
import { createDemoGroupService } from "../utils/demoGroupService";

export default function GroupsDemoPage() {
  const [service] = useState(createDemoGroupService);

  return (
    <AppShell>
      <div className="sv-banner" role="note">
        Demo mode: sample students, nothing is saved. Refresh the page to start over.
      </div>
      <ReviewGroups user={{ uid: "demo-instructor" }} surveyId="demo" service={service} />
    </AppShell>
  );
}
