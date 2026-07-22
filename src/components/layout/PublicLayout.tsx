import { NavLink, Outlet, Link, useLocation, ScrollRestoration } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Phone, MapPin, Menu, X, ArrowUpRight, ChevronDown, Building2, Luggage } from 'lucide-react';
import { Fragment, Suspense, useState, useEffect, useRef } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { Logo } from '@/components/brand/Logo';
import { LanguageSwitch, ThemeToggle } from '@/components/controls';
import { Button, Spinner } from '@/components/ui';
import { company } from '@/lib/env';
import { cn } from '@/lib/utils';
import { whatsappUrl } from '@/lib/contact';
import { WhatsAppIcon, FacebookIcon } from '@/components/brand/ContactIcons';

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

/** The "Офиси" group — three location pages under one dropdown so the top bar
 *  stays clean. Titles come from i18n; the one-line descriptions live here. */
const OFFICE_LINKS = [
  {
    to: '/uk-offices',
    icon: Building2,
    key: 'nav.uk_offices',
    desc: { bg: '4 адреса за предаване на пратки', en: '4 drop-off locations' },
  },
  {
    to: '/bg-office',
    icon: MapPin,
    key: 'nav.bg_office',
    desc: { bg: 'Еконт „Гоце Делчев · Панаирски ливади“', en: 'Econt “Gotse Delchev · Panairski Livadi”' },
  },
  {
    to: '/bg-to-uk',
    icon: Luggage,
    key: 'nav.bg_to_uk',
    desc: { bg: 'Как да изпратиш багаж до Англия', en: 'How to send baggage to the UK' },
  },
] as const;

/** Desktop dropdown: opens on hover or click, closes on navigate / Esc / outside click. */
function OfficesMenu({ lang }: { lang: 'bg' | 'en' }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = OFFICE_LINKS.some((l) => pathname === l.to);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          'inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors xl:px-3',
          active || open ? 'text-brand' : 'text-muted-fg hover:text-foreground',
        )}
      >
        {t('nav.offices')}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute left-0 top-full z-50 pt-2"
          >
            <div className="w-[330px] overflow-hidden rounded-2xl border border-border bg-card p-2 shadow-lift">
              {OFFICE_LINKS.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors',
                      isActive ? 'bg-brand-50' : 'hover:bg-muted',
                    )
                  }
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    <l.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">{t(l.key)}</span>
                    <span className="block text-xs text-muted-fg">{l.desc[lang]}</span>
                  </span>
                </NavLink>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PublicLayout() {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const [open, setOpen] = useState(false);

  // Per-page <title> + canonical (SPA — set on each navigation; lang re-runs on switch).
  useEffect(() => {
    const brand = t('brand.name');
    const titles: Record<string, string> = {
      '/services': t('nav.services'),
      '/quote': t('nav.quote'),
      '/track': t('nav.track'),
      '/coverage': t('nav.coverage'),
      '/uk-offices': t('nav.uk_offices'),
      '/bg-office': t('nav.bg_office'),
      '/bg-to-uk': t('nav.bg_to_uk'),
      '/about': t('nav.about'),
      '/faq': t('nav.faq'),
      '/contact': t('nav.contact'),
    };
    const page = titles[pathname];
    document.title = page
      ? `${page} · ${brand}`
      : `${brand} — ${lang === 'en' ? 'Parcels UK ⇄ Bulgaria' : 'Колети Великобритания ⇄ България'}`;
    let link = document.querySelector<HTMLLinkElement>("link[rel='canonical']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = `https://hubenov.delivery${pathname}`;
  }, [pathname, lang, t]);

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollRestoration />
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link to="/" className="shrink-0">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex xl:gap-1">
            {NAV.map((n) => (
              <Fragment key={n.to}>
                <NavLink
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    cn(
                      'rounded-lg px-2.5 py-2 text-sm font-medium transition-colors xl:px-3',
                      isActive ? 'text-brand' : 'text-muted-fg hover:text-foreground',
                    )
                  }
                >
                  {t(n.key)}
                </NavLink>
                {n.to === '/track' && <OfficesMenu lang={lang} />}
              </Fragment>
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
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted lg:hidden"
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? t('common.close') : t('common.menu')}
              aria-expanded={open}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <nav className="max-h-[calc(100vh-4rem)] overflow-y-auto overscroll-contain border-t border-border bg-background px-4 py-3 lg:hidden">
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

              <p className="mt-2 border-t border-border px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-muted-fg">
                {t('nav.offices')}
              </p>
              {OFFICE_LINKS.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium',
                      isActive ? 'bg-brand-50 text-brand-700' : 'text-foreground hover:bg-muted',
                    )
                  }
                >
                  <l.icon className="h-4 w-4 text-brand" /> {t(l.key)}
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
            <a
              href={company.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-[#1877F2]/40 hover:text-[#1877F2]"
            >
              <FacebookIcon className="h-4 w-4 text-[#1877F2]" />
              {lang === 'en' ? 'Follow us on Facebook' : 'Последвайте ни във Facebook'}
            </a>
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
              {OFFICE_LINKS.map((l) => (
                <Link key={l.to} to={l.to} className="text-muted-fg hover:text-brand">
                  {t(l.key)}
                </Link>
              ))}
              <Link to="/rules" className="text-muted-fg hover:text-brand">
                {t('nav.rules')}
              </Link>
            </nav>
          </div>
        </div>
        <div className="space-y-1 border-t border-border py-5 text-center text-xs text-muted-fg">
          <p>
            {lang === 'en'
              ? 'Last-mile delivery partner in Bulgaria: Econt'
              : 'Партньор за последна миля в България: Еконт'}
          </p>
          <p>
            © {new Date().getFullYear()} {t('brand.name')}. {t('footer.rights')}
          </p>
          <p className="flex items-center justify-center gap-1.5 pt-1.5">
            <span>{lang === 'en' ? 'Web design & development by' : 'Уеб дизайн и разработка от'}</span>
            <a
              href="https://gosmartr.co.uk/"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-0.5 font-semibold"
            >
              <span className="bg-gradient-to-r from-brand to-emerald-500 bg-clip-text text-transparent transition-opacity group-hover:opacity-80">
                GoSmartR
              </span>
              <ArrowUpRight className="h-3 w-3 -translate-y-px text-brand opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
            </a>
          </p>
        </div>
      </footer>

      {/* Floating WhatsApp — one-tap contact for the non-techy audience.
          Hidden while the mobile menu is open so it never overlaps the menu's
          Вход / language row (a FAB always yields to an open full-screen menu). */}
      <a
        href={whatsappUrl()}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('contact.whatsapp')}
        aria-hidden={open}
        tabIndex={open ? -1 : undefined}
        className={cn(
          'fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lift transition-all duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2',
          open && 'pointer-events-none translate-y-3 opacity-0',
        )}
      >
        <WhatsAppIcon className="h-7 w-7" />
      </a>
    </div>
  );
}
