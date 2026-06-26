import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Resets scroll to the top on every route (pathname) change. React Router keeps
 * the scroll position by default on client-side navigation, which left users
 * mid-page after clicking a nav link. Hash-only changes are left alone so in-page
 * anchors still work. Renders nothing.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}
