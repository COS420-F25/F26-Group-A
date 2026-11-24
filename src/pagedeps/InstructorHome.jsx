import { useState } from "react";
import { signOutAndGoHome } from "@authent/signOutAndGoHome.js";
import {
  instructorStyles as s,
  INSTRUCTOR_CSS,
} from "../styles/instructorStyles.js";

// Instructor home
// using placeholder data/content for now (mockup, no auth)

const COURSE = { code: "COS 420", label: "COS 420: Software Engineering" };
const USER = { name: "Prof. Smith", initials: "PS", role: "Instructor" };

const PREVIEW = {
  group: "Group 3",
  members: ["Student A", "Student B", "Student C", "You"],
  meets: "Meets Wednesdays, 6:00-7:00 PM ET",
};

export const STEPS = [
  {
    time: "about 3 min",
    title: "Pick meeting windows",
    text: "Choose the times students can select, and set your matching rules.",
  },
  {
    time: "2 min per student",
    title: "Students take the survey",
    text: "Share one link. Students mark when they're free and what's been hard.",
  },
  {
    time: "about 5 min",
    title: "Review and publish",
    text: "Check the suggested groups, move anyone you like, then publish.",
  },
];

export const FAQS = [
  {
    question: "How do I keep track of how groups are doing?",
    answer: "Answer coming soon.",
  },
  {
    question: "What if a student doesn't fill out the survey?",
    answer: "Answer coming soon.",
  },
];

// Rendered link that goes nowhere yet: no href, aria-disabled.
function DisabledLink({ className, style, children }) {
  return (
    <a
      aria-disabled="true"
      className={className}
      style={{ ...style, ...s.disabled }}
    >
      {children}
    </a>
  );
}

function handleSignOut(e) {
  e.preventDefault();
  signOutAndGoHome();
}

function Sidebar() {
  return (
    <aside className="ih-sidebar" style={s.sidebar}>
      <div style={s.brand}>
        <span style={s.logo} aria-hidden="true" />
        StudyBuddies
      </div>
      <div style={s.courseLabel}>{COURSE.label.toUpperCase()}</div>

      <nav aria-label="Course" style={s.nav}>
        <a
          href="/instructor"
          aria-current="page"
          className="ih-nav"
          style={s.navItemActive}
        >
          Reflection groups
        </a>
        <DisabledLink className="ih-nav" style={s.navItem}>
          # general
        </DisabledLink>
        <DisabledLink className="ih-nav" style={s.navItem}>
          # announcements
        </DisabledLink>
      </nav>

      <div style={s.sidebarBottom}>
        <DisabledLink className="ih-nav" style={s.navItem}>
          Settings
        </DisabledLink>
        <a
          href="/"
          onClick={handleSignOut}
          className="ih-nav"
          style={s.navItem}
        >
          Sign out
        </a>
        <div style={s.userChip}>
          <span style={s.avatar} aria-hidden="true">
            {USER.initials}
          </span>
          <div style={s.userText}>
            <div style={s.userName}>{USER.name}</div>
            <div style={s.userRole}>{USER.role}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function StudentPreviewCard() {
  return (
    <div style={s.previewOuter}>
      <div style={s.previewLabel}>WHAT A STUDENT SEES</div>
      <div style={s.previewInner}>
        <div style={s.previewTitle}>Your group: {PREVIEW.group}</div>
        <div style={s.previewMembers}>{PREVIEW.members.join(" · ")}</div>
        <span style={s.previewMeeting}>{PREVIEW.meets}</span>
      </div>
    </div>
  );
}

function Steps() {
  return (
    <section style={s.section} aria-labelledby="how-setup-works">
      <h2 id="how-setup-works" style={s.sectionTitle}>
        How setup works
      </h2>
      <ol className="ih-steps" style={s.steps}>
        {STEPS.map((step, i) => (
          <li key={step.title} style={s.stepCard}>
            <p style={s.stepLabel}>
              STEP {i + 1} · {step.time}
            </p>
            <h3 style={s.stepTitle}>{step.title}</h3>
            <p style={s.stepText}>{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="ih-faq"
      style={s.faqItem}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary style={s.faqSummary}>
        <span>{question}</span>
        <span aria-hidden="true" style={s.faqToggle}>
          {open ? "-" : "+"}
        </span>
      </summary>
      <div style={s.faqAnswer}>{answer}</div>
    </details>
  );
}

function Faq() {
  return (
    <section style={s.section} aria-labelledby="common-questions">
      <h2 id="common-questions" style={s.sectionTitle}>
        Common questions
      </h2>
      <div>
        {FAQS.map((f) => (
          <FaqItem key={f.question} {...f} />
        ))}
      </div>
    </section>
  );
}

export default function InstructorHome() {
  return (
    <div className="ih-shell" style={s.shell}>
      <style>{INSTRUCTOR_CSS}</style>
      <Sidebar />
      <main className="ih-main" style={s.main}>
        <div style={s.content}>
          <div className="ih-hero" style={s.hero}>
            <div>
              <span style={s.pill}>Reflection groups · {COURSE.code}</span>
              <h1 style={s.h1}>
                Give every student a small group they can be honest with.
              </h1>
              <p style={s.lead}>
                Students answer a 2-minute survey about when they can meet. You
                get suggested groups of classmates who can actually meet each
                week. Review them, adjust anything, and publish.
              </p>
              <div style={s.buttonColumn}>
                <a href="/survey" className="ih-btn" style={s.primaryButton}>
                  Set up reflection groups
                  <span style={s.buttonBadge}>~10 min</span>
                </a>
                <DisabledLink className="ih-btn" style={s.secondaryButton}>
                  Upload groups I already have
                </DisabledLink>
                <p style={s.finePrint}>
                  Students see nothing until you open the survey, and no groups
                  until you publish.
                </p>
              </div>
            </div>
            <StudentPreviewCard />
          </div>
          <Steps />
          <Faq />
        </div>
      </main>
    </div>
  );
}
