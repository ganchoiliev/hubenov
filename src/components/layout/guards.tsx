import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { Spinner } from '@/components/ui';
import { NameGate } from '@/components/layout/NameGate';

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

/** Require any authenticated user (client portal). */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <FullScreenLoader />;
  if (!session) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return <NameGate>{children}</NameGate>;
}

/** Require staff (operator/owner/driver) — gate the operator console (§3). */
export function RequireStaff({ children }: { children: ReactNode }) {
  const { session, loading, isStaff } = useAuth();
  const loc = useLocation();
  if (loading) return <FullScreenLoader />;
  if (!session) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (!isStaff) return <Navigate to="/portal" replace />;
  return <NameGate>{children}</NameGate>;
}
