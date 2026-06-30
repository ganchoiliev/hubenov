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

initSentry(); // error monitoring — no-op unless VITE_SENTRY_LOADER_URL is set

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
