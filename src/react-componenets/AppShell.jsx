// The page frame for survey screens
export default function AppShell({ children }) {
  return <div className="sv-main-content">{children}</div>;
}

// The main part of a screen. Pass an ActionBar as footer to pin buttons to the bottom.
export function Page({ footer, children }) {
  return (
    <>
      <div style={{ paddingBottom: "2rem" }}>{children}</div>
      {footer}
    </>
  );
}

// The bar of buttons pinned to the bottom of a screen
export function ActionBar({ note, children }) {
  return (
    <div className="sv-footer">
      <div className="sv-footer-inner">
        {note && <p className="sv-footer-note">{note}</p>}
        {children}
      </div>
    </div>
  );
}
