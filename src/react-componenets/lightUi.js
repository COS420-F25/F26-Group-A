// light theme because that's what our mockups say

export const light = {
    background: "#ffffff",
    sidebar: "#f7f8fa",
    surface: "#f4f5f7",
    border: "#e3e5e8",
    text: "#000000",
    subtext: "#4b5563",
    accent: "#2848c9",
    accentHover: "#1f3aa8",
    accentSoft: "#e6ebfb",
    inputBorder: "#c9ccd1",
    danger: "#b91c1c"
};

const border = `1px solid ${light.border}`;

const button = {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 20px",
    borderRadius: 8,
    fontSize: 16,
    textDecoration: "none"
};


const pill = {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    background: light.accentSoft,
    color: light.accent,
    fontSize: 13,
    fontWeight: 600
};

export const lightStyles = {
    // page frame: sidebar | main
    shell: {
        display: "flex",
        minHeight: "100vh",
        background: light.background,
        color: light.text,
        fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    },

    // sidebar
    sidebar: {
        width: 240,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "20px 14px",
        background: light.sidebar,
        borderRight: border
    },
    brand: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 6px 16px",
        fontSize: 17,
        fontWeight: 700,
        color: light.accent,
        textDecoration: "none"
    },
    logo: { width: 28, height: 28, borderRadius: 6, background: light.accent, flexShrink: 0 },
    courseLabel: {
        padding: "0 12px 8px",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: light.subtext
    },
    navItem: {
        display: "block",
        padding: "7px 12px",
        borderRadius: 8,
        fontSize: 15,
        color: light.subtext,
        textDecoration: "none"
    },
    navItemActive: {
        display: "block",
        padding: "7px 12px",
        borderRadius: 8,
        fontSize: 15,
        fontWeight: 600,
        color: light.accent,
        background: light.accentSoft,
        textDecoration: "none"
    },
    disabled: { opacity: 0.6, cursor: "not-allowed" },
    sidebarBottom: { marginTop: "auto", display: "flex", flexDirection: "column", gap: 4 },
    userChip: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px 0" },
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
    userName: { fontSize: 14, fontWeight: 600, margin: 0 },
    userRole: { fontSize: 12, color: light.subtext, margin: 0 },

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
    pill,
    h1: { fontSize: 38, lineHeight: 1.15, fontWeight: 700, margin: "16px 0", color: light.text },
    lead: { fontSize: 17, lineHeight: 1.6, color: light.subtext, margin: "0 0 24px" },
    buttonColumn: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12 },
    primaryButton: {
        ...button,
        background: light.accent,
        color: "#ffffff",
        fontWeight: 600,
        border: `1px solid ${light.accent}`
    },
    buttonBadge: {
        padding: "2px 8px",
        borderRadius: 999,
        background: "#ffffff",
        color: light.accent,
        fontSize: 12,
        fontWeight: 700
    },
    secondaryButton: {
        ...button,
        background: light.background,
        color: light.text,
        border: `1px solid ${light.inputBorder}`
    },
    finePrint: { fontSize: 13, color: light.subtext, margin: "12px 0 0" },

    // "what a student sees" card
    previewOuter: { background: light.surface, border, borderRadius: 16, padding: 20 },
    previewLabel: {
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: light.subtext,
        margin: "0 0 10px"
    },
    previewInner: { background: light.background, border, borderRadius: 12, padding: 16 },
    previewTitle: { fontSize: 15, fontWeight: 600, margin: "0 0 8px" },
    previewMembers: { fontSize: 14, color: light.subtext, margin: "0 0 10px" },
    previewMeeting: {
        padding: "6px 10px",
        borderRadius: 8,
        background: light.accentSoft,
        color: light.accent,
        fontSize: 13
    },

    // sections
    sectionTitle: { fontSize: 19, fontWeight: 600, margin: "0 0 12px" },
    section: { marginBottom: 32 },
    steps: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 },
    stepCard: { border, borderRadius: 8, padding: 20, background: light.background },
    stepLabel: { fontSize: 13, fontWeight: 600, color: light.accent, margin: "0 0 4px" },
    stepTitle: { fontSize: 16, fontWeight: 600, margin: "0 0 6px" },
    stepText: { fontSize: 14, lineHeight: 1.5, color: light.subtext, margin: 0 },

    // FAQ accordion (<details>/<summary>)
    faqItem: { border, borderRadius: 8, marginBottom: 10, background: light.background },
    faqSummary: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 16px",
        fontSize: 15,
        cursor: "pointer",
        listStyle: "none"
    },
    faqAnswer: { padding: "0 16px 14px", fontSize: 14, color: light.subtext, margin: 0 },

    // login screen
    loginPage: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: light.sidebar,
        color: light.text,
        fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    },
    loginCard: {
        width: "100%",
        maxWidth: 560,
        background: light.background,
        border,
        borderRadius: 16,
        padding: 32,
        textAlign: "center"
    },
    roleButtons: { display: "flex", flexWrap: "wrap", gap: 16, marginTop: 24 },
    roleButton: {
        flex: "1 1 200px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: 24,
        border,
        borderRadius: 12,
        textDecoration: "none",
        color: light.text,
        background: light.background
    },
    roleTitle: { fontSize: 20, fontWeight: 700, color: light.accent },
    roleText: { fontSize: 14, color: light.subtext },

    // sign-in form
    authBrand: {
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 20,
        fontSize: 17,
        fontWeight: 700,
        color: light.accent
    },
    form: { display: "flex", flexDirection: "column", gap: 16, marginTop: 24, textAlign: "left" },
    field: { display: "flex", flexDirection: "column", gap: 6 },
    label: { fontSize: 14, fontWeight: 600, color: light.text },
    input: {
        padding: "11px 12px",
        fontSize: 16,
        fontFamily: "inherit",
        color: light.text,
        background: light.background,
        border: `1px solid ${light.inputBorder}`,
        borderRadius: 8
    },
    fieldset: { border: 0, margin: 0, padding: 0 },
    segmented: { display: "flex", gap: 8 },
    segment: {
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px 12px",
        border: `1px solid ${light.inputBorder}`,
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        color: light.text,
        background: light.background
    },
    submitButton: {
        ...button,
        justifyContent: "center",
        background: light.accent,
        color: "#ffffff",
        fontWeight: 600,
        border: `1px solid ${light.accent}`,
        cursor: "pointer",
        fontFamily: "inherit"
    },
    googleButton: {
        ...button,
        justifyContent: "center",
        background: light.background,
        color: light.text,
        fontWeight: 600,
        border: `1px solid ${light.inputBorder}`,
        cursor: "pointer",
        fontFamily: "inherit",
        width: "100%",
        boxSizing: "border-box"
    },
    divider: { display: "flex", alignItems: "center", gap: 12, margin: "20px 0 0", color: light.subtext, fontSize: 13 },
    dividerLine: { flex: 1, height: 1, background: light.border },
    errorText: { color: light.danger, fontSize: 14, margin: 0 },
    linkButton: {
        background: "none",
        border: 0,
        padding: 0,
        font: "inherit",
        color: light.accent,
        fontWeight: 600,
        cursor: "pointer"
    },
    textLink: { color: light.accent, fontWeight: 600, textDecoration: "none" },
    altLine: { fontSize: 14, color: light.subtext, margin: "20px 0 0" }
};
