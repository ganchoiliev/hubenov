import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { MotionConfig, LazyMotion, domAnimation } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import './index.css';
import './lib/i18n';
import { initSentry } from './lib/sentry';
import { router } from './router';
import { ThemeProvider } from './components/theme/ThemeProvider';
import { ToastProvider } from './components/ui/toast';
import { ConfirmProvider } from './components/ui/confirm';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './lib/auth';
import { Analytics } from '@vercel/analytics/react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Error monitoring only on the authenticated app (/op, /portal, /login) — the
// public marketing pages stay free of the Sentry bundle (it was the heaviest
// third-party weight there: replay + tracing + preconnects). No-op unless
// VITE_SENTRY_LOADER_URL is set.
if (/^\/(op|portal|login|reset-password)(\/|$)/.test(window.location.pathname)) {
  initSentry();
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <LazyMotion features={domAnimation} strict>
              <MotionConfig reducedMotion="user">
                <ConfirmProvider>
                  <ErrorBoundary>
                    <RouterProvider router={router} />
                  </ErrorBoundary>
                </ConfirmProvider>
              </MotionConfig>
            </LazyMotion>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
    <Analytics />
  </React.StrictMode>,
);
