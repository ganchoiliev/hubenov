/**
 * Top-level safety net. A React render crash would otherwise white-screen the
 * app; this shows a friendly fallback and forwards the error to Sentry (the
 * boundary swallows it before window.onerror, so we report it explicitly).
 */
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown): void {
    const w = window as unknown as { Sentry?: { captureException?: (e: unknown) => void } };
    w.Sentry?.captureException?.(error);
  }

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-6">
        <div className="max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
          <h1 className="font-display text-xl font-extrabold text-foreground">Нещо се обърка</h1>
          <p className="mt-2 text-sm text-muted-fg">
            Възникна неочаквана грешка. Моля, опреснете страницата.
            <br />
            Something went wrong — please reload the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-fg transition-colors hover:bg-brand-600"
          >
            Опресни · Reload
          </button>
        </div>
      </div>
    );
  }
}
