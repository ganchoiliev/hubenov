import { NavLink, Outlet, Link, useNavigate, ScrollRestoration } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, type LucideIcon } from 'lucide-react';
import { Suspense, useState } from 'react';
import { Logo } from '@/components/brand/Logo';
import { LanguageSwitch, ThemeToggle } from '@/components/controls';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useRealtimeSync } from '@/lib/queries';
import { cn } from '@/lib/utils';

export interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  end?: boolean;
}

export function AppLayout({ items, scope }: { items: NavItem[]; scope: 'portal' | 'operator' }) {
  const { t } = useTranslation();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  useRealtimeSync(); // live updates across the app — no manual refresh

  const onSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      <ScrollRestoration />
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 -translate-x-full border-r border-border bg-card transition-transform lg:translate-x-0',
          mobileOpen && 'translate-x-0',
        )}
      >
        <div className="flex h-16 items-center border-b border-border px-5">
          <Link to="/">
            <Logo />
          </Link>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand text-brand-fg shadow-soft'
                    : 'text-muted-fg hover:bg-muted hover:text-foreground',
                )
              }
            >
              <it.icon className="h-4.5 w-4.5" />
              {t(it.labelKey)}
            </NavLink>
          ))}
        </nav>
        <div className="absolute inset-x-3 bottom-3">
          <button
            onClick={onSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted-fg hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4.5 w-4.5" />
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/85 px-5 backdrop-blur-lg">
          <button
            className="rounded-lg p-2 text-foreground lg:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Menu"
          >
            <span className="i">≡</span>
          </button>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-fg">
            {scope === 'operator' ? t('nav.console') : t('nav.portal')}
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-fg sm:inline">{profile?.full_name}</span>
            <LanguageSwitch />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-5 md:p-8">
          <Suspense
            fallback={
              <div className="flex min-h-[60vh] items-center justify-center">
                <Spinner className="h-8 w-8" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
