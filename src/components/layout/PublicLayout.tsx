import { NavLink, Outlet, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Phone, MapPin, Menu, X } from 'lucide-react';
import { Suspense, useState } from 'react';
import { Logo } from '@/components/brand/Logo';
import { LanguageSwitch, ThemeToggle } from '@/components/controls';
import { Button, Spinner } from '@/components/ui';
import { company } from '@/lib/env';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', key: 'nav.home', end: true },
  { to: '/services', key: 'nav.services' },
  { to: '/quote', key: 'nav.quote' },
  { to: '/track', key: 'nav.track' },
  { to: '/coverage', key: 'nav.coverage' },
  { to: '/about', key: 'nav.about' },
  { to: '/faq', key: 'nav.faq' },
  { to: '/contact', key: 'nav.contact' },
];

export function PublicLayout() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link to="/" className="shrink-0">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'text-brand' : 'text-muted-fg hover:text-foreground',
                  )
                }
              >
                {t(n.key)}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <LanguageSwitch className="hidden sm:flex" />
            <ThemeToggle />
            <Link to="/login" className="hidden sm:block">
              <Button size="sm" variant="outline">
                {t('nav.login')}
              </Button>
            </Link>
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground lg:hidden"
              onClick={() => setOpen((o) => !o)}
              aria-label="Menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <nav className="border-t border-border bg-background px-4 py-3 lg:hidden">
            <div className="flex flex-col gap-1">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'rounded-lg px-3 py-2.5 text-sm font-medium',
                      isActive ? 'bg-brand-50 text-brand-700' : 'text-foreground hover:bg-muted',
                    )
                  }
                >
                  {t(n.key)}
                </NavLink>
              ))}
              <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
                <LanguageSwitch />
                <Link to="/login" onClick={() => setOpen(false)}>
                  <Button size="sm" variant="primary">
                    {t('nav.login')}
                  </Button>
                </Link>
              </div>
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">
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

      <footer className="border-t border-border bg-muted/40">
        <div className="container grid gap-8 py-12 md:grid-cols-3">
          <div className="space-y-3">
            <Logo />
            <p className="max-w-xs text-sm text-muted-fg">{t('footer.made')}.</p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-foreground">{t('footer.address_label')}</p>
            <p className="flex items-start gap-2 text-muted-fg">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              {company.address}
            </p>
            <p className="flex items-center gap-2 text-muted-fg">
              <Phone className="h-4 w-4 shrink-0" />
              <a href={`tel:${company.phone.replace(/\s/g, '')}`} className="hover:text-brand">
                {company.phone}
              </a>
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-foreground">{t('brand.name')}</p>
            <nav className="flex flex-col gap-1.5">
              {NAV.slice(1, 5).map((n) => (
                <Link key={n.to} to={n.to} className="text-muted-fg hover:text-brand">
                  {t(n.key)}
                </Link>
              ))}
            </nav>
          </div>
        </div>
        <div className="border-t border-border py-5 text-center text-xs text-muted-fg">
          © {new Date().getFullYear()} {t('brand.name')}. {t('footer.rights')}
        </div>
      </footer>
    </div>
  );
}
