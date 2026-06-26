import { NavLink, Outlet, Link, useNavigate, ScrollRestoration } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, Menu, X, Search, type LucideIcon } from 'lucide-react';
import { Suspense, useState, useEffect } from 'react';
import { Logo } from '@/components/brand/Logo';
import { LanguageSwitch, ThemeToggle } from '@/components/controls';
import { CommandPalette } from '@/components/operator/CommandPalette';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useRealtimeSync, useOpUnread, useClientUnread } from '@/lib/queries';
import { cn } from '@/lib/utils';

export interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: 'messages';
}

export function AppLayout({ items, scope }: { items: NavItem[]; scope: 'portal' | 'operator' }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  useRealtimeSync(); // live updates across the app — no manual refresh

  // Unread-message badges (one query fires per scope; the other stays disabled).
  const { data: opUnread } = useOpUnread(scope === 'operator');
  const { data: clientUnread } = useClientUnread(scope === 'portal');
  const unread = scope === 'operator' ? opUnread ?? 0 : clientUnread ?? 0;

  // Close the mobile drawer on Escape.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  // ⌘K / Ctrl+K opens the operator command palette.
  useEffect(() => {
    if (scope !== 'operator') return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [scope]);

  const onSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      <ScrollRestoration />
      {scope === 'operator' && <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />}
      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      {/* Sidebar */}
      <aside
        id="app-sidebar"
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 -translate-x-full border-r border-border bg-card transition-transform lg:translate-x-0',
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
              <span className="flex-1">{t(it.labelKey)}</span>
              {it.badge === 'messages' && unread > 0 && (
                <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
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
            className="rounded-lg p-2 text-foreground transition-colors hover:bg-muted lg:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={mobileOpen}
            aria-controls="app-sidebar"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          {scope === 'operator' ? (
            <button
              onClick={() => setSearchOpen(true)}
              className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-sm text-muted-fg transition-colors hover:bg-muted sm:max-w-xs"
              aria-label={lang === 'en' ? 'Search' : 'Търсене'}
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{lang === 'en' ? 'Search…' : 'Търси…'}</span>
              <kbd className="hidden rounded bg-card px-1.5 py-0.5 text-[10px] font-medium sm:inline">⌘K</kbd>
            </button>
          ) : (
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-fg">
              {t('nav.portal')}
            </div>
          )}
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
