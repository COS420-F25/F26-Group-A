// Dark theme for the sign-in / sign-up pages.
// Same palette as the dark tokens in index.css, but hard-coded so these
// pages look right even if index.css is not loaded on them.

export const dark = {
    background: "#0f1115",
    sidebar: "#14171d",
    surface: "#1a1d24",
    surfaceHover: "#242834",
    border: "#2c313c",
    inputBorder: "#3a4050",
    text: "#e8eaee",
    subtext: "#9aa3b2",
    accent: "#6b8cff",
    accentSoft: "rgba(107, 140, 255, 0.18)",
    onAccent: "#0b1020",
    danger: "#f87171"
};

const border = `1px solid ${dark.border}`;

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
    cursor: "pointer",
    justifyContent: "center"
};

// Hover / focus / disabled can't be inline styles, so AuthCard renders this.
// It only sets properties the inline styles leave alone.
export const AUTH_CSS = `
.auth-btn:hover:not(:disabled) { filter: brightness(1.15); }
.auth-btn:disabled { opacity: 0.55; cursor: default; }
.auth-choice:hover { filter: brightness(1.25); }
.auth-btn:focus-visible,
.auth-choice:focus-visible,
.auth-link:focus-visible,
.auth-segment:focus-within { outline: 2px solid ${dark.accent}; outline-offset: 2px; }
.auth-input:focus { outline: 2px solid ${dark.accent}; outline-offset: 1px; }
.auth-input::placeholder { color: ${dark.subtext}; }
`;

export const authStyles = {
    // page + card
    loginPage: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: dark.sidebar,
        color: dark.text,
        colorScheme: "dark",
        fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    },
    loginCard: {
        width: "100%",
        maxWidth: 560,
        background: dark.background,
        border,
        borderRadius: 16,
        padding: 32,
        textAlign: "center",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.45)"
    },
    authBrand: {
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 20,
        fontSize: 17,
        fontWeight: 700,
        color: dark.accent
    },
    logo: { width: 28, height: 28, borderRadius: 6, background: dark.accent, flexShrink: 0 },
    title: { fontSize: 30, lineHeight: 1.15, fontWeight: 700, margin: "0 0 8px", color: dark.text },
    subtitle: { fontSize: 17, lineHeight: 1.6, color: dark.subtext, margin: 0 },

    // role cards (sign-up step 1)
    roleButtons: { display: "flex", flexWrap: "wrap", gap: 16, marginTop: 24 },
    roleButton: {
        flex: "1 1 200px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: 24,
        border,
        borderRadius: 12,
        color: dark.text,
        background: dark.surface,
        font: "inherit",
        textAlign: "center",
        cursor: "pointer"
    },
    roleTitle: { fontSize: 20, fontWeight: 700, color: dark.accent },
    roleText: { fontSize: 14, color: dark.subtext },

    // forms
    form: { display: "flex", flexDirection: "column", gap: 16, marginTop: 24, textAlign: "left" },
    field: { display: "flex", flexDirection: "column", gap: 6 },
    label: { fontSize: 14, fontWeight: 600, color: dark.text },
    input: {
        padding: "11px 12px",
        fontSize: 16,
        fontFamily: "inherit",
        color: dark.text,
        background: dark.background,
        border: `1px solid ${dark.inputBorder}`,
        borderRadius: 8
    },
    fieldset: { border: 0, margin: 0, padding: 0 },
    legend: { fontSize: 14, fontWeight: 600, color: dark.text, marginBottom: 6, padding: 0 },
    segmented: { display: "flex", gap: 8 },
    segment: {
        position: "relative",
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px 12px",
        border: `1px solid ${dark.inputBorder}`,
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        color: dark.text,
        background: dark.background
    },
    // applied on top of `segment` when that role is selected
    segmentOn: {
        color: dark.accent,
        background: dark.accentSoft,
        border: `1px solid ${dark.accent}`
    },
    srOnly: {
        position: "absolute",
        width: 1,
        height: 1,
        overflow: "hidden",
        clip: "rect(0 0 0 0)",
        whiteSpace: "nowrap"
    },

    // buttons
    submitButton: {
        ...button,
        background: dark.accent,
        color: dark.onAccent,
        border: `1px solid ${dark.accent}`
    },
    googleButton: {
        ...button,
        width: "100%",
        boxSizing: "border-box",
        background: dark.surface,
        color: dark.text,
        border: `1px solid ${dark.inputBorder}`
    },

    // misc text
    divider: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        margin: "20px 0 0",
        color: dark.subtext,
        fontSize: 13
    },
    dividerLine: { flex: 1, height: 1, background: dark.border },
    errorText: { color: dark.danger, fontSize: 14, margin: 0 },
    linkButton: {
        background: "none",
        border: 0,
        padding: 0,
        font: "inherit",
        color: dark.accent,
        fontWeight: 600,
        cursor: "pointer"
    },
    textLink: { color: dark.accent, fontWeight: 600, textDecoration: "none" },
    altLine: { fontSize: 14, color: dark.subtext, margin: "20px 0 0" }
};
