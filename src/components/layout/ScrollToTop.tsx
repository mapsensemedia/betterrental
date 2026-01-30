/**
 * ScrollToTop - Scrolls to top on route change
 * Uses instant behavior for immediate scroll
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Use instant behavior for immediate scroll to top
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
