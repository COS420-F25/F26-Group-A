// Dark theme for the instructor home page.
// Uses the same palette as the sign-in / sign-up pages and does not depend on
// index.css or the Astro layout.

import { dark } from "./authStyles.js";

const border = `1px solid ${dark.border}`;
const font = "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif";

const button = {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 20px",
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 600,
    fontFamily: "inherit",
    textDecoration: "none",
    cursor: "pointer"
};

const navItem = {
    display: "block",
    padding: "7px 12px",
    borderRadius: 8,
    fontSize: 15,
    color: dark.subtext,
    textDecoration: "none",
    cursor: "pointer"
};

// Hover, focus and small-screen rules can't be inline styles, so
// InstructorHome renders this. !important in the media queries is needed
// to beat the inline layout styles.
export const INSTRUCTOR_CSS = `
.ih-nav:hover:not([aria-disabled="true"]) { background: ${dark.surfaceHover}; color: ${dark.text}; }
.ih-btn:hover:not([aria-disabled="true"]) { filter: brightness(1.15); }
.ih-nav:focus-visible,
.ih-btn:focus-visible,
.ih-faq summary:focus-visible { outline: 2px solid ${dark.accent}; outline-offset: 2px; }
.ih-faq summary::-webkit-details-marker { display: none; }

@media (max-width: 900px) {
  .ih-hero { grid-template-columns: 1fr !important; gap: 24px !important; }
  .ih-steps { grid-template-columns: 1fr !important; }
  .ih-main { padding: 32px 24px 48px !important; }
}
@media (max-width: 768px) {
  .ih-shell { flex-direction: column !important; }
  .ih-sidebar {
    width: 100% !important;
    height: auto !important;
    position: static !important;
    box-sizing: border-box;
    border-right: 0 !important;
    border-bottom: 1px solid ${dark.border} !important;
  }
}
`;

export const instructorStyles = {
    // page frame: sidebar | main
    shell: {
        display: "flex",
        minHeight: "100vh",
        background: dark.background,
        color: dark.text,
        colorScheme: "dark",
        fontFamily: font
    },

    // sidebar
    sidebar: {
        width: 240,
        flexShrink: 0,
        position: "sticky",
        top: 0,
        alignSelf: "flex-start",
        height: "100vh",
        overflowY: "auto",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "20px 14px",
        background: dark.sidebar,
        borderRight: border
    },
    brand: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 6px 16px",
        fontSize: 17,
        fontWeight: 700,
        color: dark.accent
    },
    logo: { width: 28, height: 28, borderRadius: 6, background: dark.accent, flexShrink: 0 },
    courseLabel: {
        padding: "0 12px 8px",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: dark.subtext
    },
    nav: { display: "flex", flexDirection: "column", gap: 2 },
    navItem,
    navItemActive: {
        ...navItem,
        fontWeight: 600,
        color: dark.accent,
        background: dark.accentSoft
    },
    disabled: { opacity: 0.6, cursor: "not-allowed" },
    sidebarBottom: { marginTop: "auto", display: "flex", flexDirection: "column", gap: 4 },
    userChip: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginTop: 4,
        padding: "12px 12px 0",
        borderTop: border
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: "#7c3aed",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        fontWeight: 700,
        flexShrink: 0
    },
    userText: { minWidth: 0 },
    userName: { fontSize: 14, fontWeight: 600, margin: 0, color: dark.text },
    userRole: { fontSize: 12, color: dark.subtext, margin: 0 },

    // main column
    main: { flex: 1, minWidth: 0, padding: "48px 64px 64px" },
    content: { maxWidth: 912 },
    hero: {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 360px",
        gap: 56,
        alignItems: "center",
        marginBottom: 40
    },
    pill: {
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 999,
        background: dark.accentSoft,
        color: dark.accent,
        fontSize: 13,
        fontWeight: 600
    },
    h1: { fontSize: 38, lineHeight: 1.15, fontWeight: 700, margin: "16px 0", color: dark.text },
    lead: { fontSize: 17, lineHeight: 1.6, color: dark.subtext, margin: "0 0 24px" },
    buttonColumn: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12 },
    primaryButton: {
        ...button,
        background: dark.accent,
        color: dark.onAccent,
        border: `1px solid ${dark.accent}`
    },
    buttonBadge: {
        padding: "2px 8px",
        borderRadius: 999,
        background: dark.background,
        color: dark.accent,
        fontSize: 12,
        fontWeight: 700
    },
    secondaryButton: {
        ...button,
        background: dark.surface,
        color: dark.text,
        border: `1px solid ${dark.inputBorder}`
    },
    finePrint: { fontSize: 13, color: dark.subtext, margin: "12px 0 0" },

    // "what a student sees" card
    previewOuter: { background: dark.surface, border, borderRadius: 16, padding: 20 },
    previewLabel: {
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: dark.subtext,
        margin: "0 0 10px"
    },
    previewInner: { background: dark.background, border, borderRadius: 12, padding: 16 },
    previewTitle: { fontSize: 15, fontWeight: 600, margin: "0 0 8px", color: dark.text },
    previewMembers: { fontSize: 14, color: dark.subtext, margin: "0 0 10px" },
    previewMeeting: {
        display: "inline-block",
        padding: "6px 10px",
        borderRadius: 8,
        background: dark.accentSoft,
        color: dark.accent,
        fontSize: 13
    },

    // sections
    section: { marginBottom: 32 },
    sectionTitle: { fontSize: 19, fontWeight: 600, margin: "0 0 12px", color: dark.text },
    steps: {
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 16,
        listStyle: "none",
        margin: 0,
        padding: 0
    },
    stepCard: { border, borderRadius: 8, padding: 20, background: dark.surface },
    stepLabel: { fontSize: 13, fontWeight: 600, color: dark.accent, margin: "0 0 4px" },
    stepTitle: { fontSize: 16, fontWeight: 600, margin: "0 0 6px", color: dark.text },
    stepText: { fontSize: 14, lineHeight: 1.5, color: dark.subtext, margin: 0 },

    // FAQ accordion
    faqItem: { border, borderRadius: 8, marginBottom: 10, background: dark.surface },
    faqSummary: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 16px",
        fontSize: 15,
        color: dark.text,
        cursor: "pointer",
        listStyle: "none"
    },
    faqToggle: { color: dark.subtext, fontSize: 18 },
    faqAnswer: { padding: "0 16px 14px", fontSize: 14, color: dark.subtext, margin: 0 }
};
