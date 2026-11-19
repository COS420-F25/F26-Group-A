import { useCallback, useEffect, useState } from "react";

// Keeps the current screen in the URL hash, like #create or #survey/abc123.
// The browser back button then moves between screens.
// With no hash, the default route is used.

const readHash = () => (typeof window === "undefined" ? "" : window.location.hash.replace(/^#/, ""));

export function useHashRoute(defaultRoute = "") {
  const [route, setRoute] = useState(() => readHash() || defaultRoute);

  useEffect(() => {
    const update = () => setRoute(readHash() || defaultRoute);
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, [defaultRoute]);

  const navigate = useCallback((next) => {
    window.location.hash = next;
  }, []);

  return [route, navigate];
}
