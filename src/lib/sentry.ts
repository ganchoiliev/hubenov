/**
 * Error monitoring (optional). Loads Sentry's CDN loader script only when
 * VITE_SENTRY_LOADER_URL is set, so the app ships without a hard dependency and
 * dev/local stays quiet. Errors report to OUR Sentry project — alert emails go
 * to Sentry org members only, never to the business owner or clients.
 *
 * Setup: Sentry → create a Browser/React project → "Loader Script" install →
 * copy the script src (https://js.sentry-cdn.com/<key>.min.js) into the env var
 * VITE_SENTRY_LOADER_URL (Vercel + local .env), then redeploy.
 */
export function initSentry(): void {
  if (typeof document === 'undefined') return;
  const url = (import.meta.env as Record<string, string | undefined>).VITE_SENTRY_LOADER_URL;
  if (!url) return;
  const s = document.createElement('script');
  s.src = url;
  s.crossOrigin = 'anonymous';
  s.async = true;
  document.head.appendChild(s);
}
