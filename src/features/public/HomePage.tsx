import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Truck,
  ShieldCheck,
  MapPin,
  Gift,
  ArrowRight,
  Search,
  PackageCheck,
  Store,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { Stagger, StaggerItem } from '@/components/motion';
import { DepartureCountdown } from '@/components/shared/DepartureCountdown';
import { Section } from '@/components/shared/common';
import { company } from '@/lib/env';

const VALUES = [
  { icon: Truck, titleKey: 'home.value_speed_title', textKey: 'home.value_speed_text' },
  { icon: ShieldCheck, titleKey: 'home.value_own_title', textKey: 'home.value_own_text' },
  { icon: MapPin, titleKey: 'home.value_econt_title', textKey: 'home.value_econt_text' },
  { icon: Gift, titleKey: 'home.value_care_title', textKey: 'home.value_care_text' },
];

const STEPS = [
  { n: 1, titleKey: 'home.how_1_title', textKey: 'home.how_1_text' },
  { n: 2, titleKey: 'home.how_2_title', textKey: 'home.how_2_text' },
  { n: 3, titleKey: 'home.how_3_title', textKey: 'home.how_3_text' },
  { n: 4, titleKey: 'home.how_4_title', textKey: 'home.how_4_text' },
];

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.5, ease: 'easeOut' as const },
};

export function HomePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';

  return (
    <>
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden">
        {/* Background image with a gradient fallback (renders well even if the
            image isn't present yet). */}
        <div
          className="absolute inset-0 -z-20 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950"
          style={{ backgroundImage: "url('/images/hero-van.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/92 via-slate-950/72 to-slate-950/30" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950/40 via-transparent to-slate-950/20" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-36 bg-gradient-to-t from-background to-transparent" />

        <div className="container grid items-center gap-10 py-20 md:py-28 lg:grid-cols-12 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-7"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/35 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              <Store className="h-3.5 w-3.5" /> Manchester · Eccles · {lang === 'bg' ? 'всеки петък' : 'every Friday'}
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white [text-shadow:0_2px_18px_rgba(2,6,23,0.55)] md:text-5xl lg:text-6xl">
              {t('home.hero_title')}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/90 [text-shadow:0_1px_10px_rgba(2,6,23,0.6)]">
              {t('home.hero_subtitle')}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/quote">
                <Button size="lg" className="gap-2">
                  {t('home.cta_quote')} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/track">
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 border-white/60 bg-white/15 text-white shadow-lg backdrop-blur-md hover:bg-white/25"
                >
                  <Search className="h-4 w-4" /> {t('home.cta_track')}
                </Button>
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-white [text-shadow:0_1px_8px_rgba(2,6,23,0.6)]">
              {[
                lang === 'bg' ? 'Курс всеки петък' : 'A van every Friday',
                lang === 'bg' ? 'Приемане в Манчестър' : 'Drop-off in Manchester',
                lang === 'bg' ? 'Онлайн проследяване' : 'Online tracking',
              ].map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" /> {s}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Next departure + route ─────────────────────────────────────── */}
      <Section className="!py-12">
        <div className="grid items-stretch gap-6 lg:grid-cols-2">
          <motion.div {...reveal}>
            <DepartureCountdown />
          </motion.div>
          <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.1 }}>
            <RouteLine lang={lang} />
          </motion.div>
        </div>
      </Section>

      {/* ── Value props ────────────────────────────────────────────────── */}
      <Section className="!pt-4 !pb-12">
        <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v) => (
            <StaggerItem key={v.titleKey}>
              <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-soft transition-shadow hover:shadow-lift">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <v.icon className="h-5.5 w-5.5" />
                </div>
                <h3 className="mt-4 font-display text-base font-bold text-foreground">{t(v.titleKey)}</h3>
                <p className="mt-1.5 text-sm text-muted-fg">{t(v.textKey)}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      {/* ── How it works ───────────────────────────────────────────────── */}
      <section className="border-y border-border bg-muted/40">
        <div className="container py-16 md:py-20">
          <motion.h2 {...reveal} className="text-center font-display text-3xl font-extrabold tracking-tight text-foreground">
            {t('home.how_title')}
          </motion.h2>
          <Stagger className="mt-12 grid gap-6 md:grid-cols-4">
            {STEPS.map((s) => (
              <StaggerItem key={s.n}>
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand font-display text-lg font-extrabold text-brand-fg shadow-soft">
                    {s.n}
                  </div>
                  <h3 className="mt-4 font-display text-base font-bold text-foreground">{t(s.titleKey)}</h3>
                  <p className="mt-1.5 text-sm text-muted-fg">{t(s.textKey)}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ── Drop-off ───────────────────────────────────────────────────── */}
      <Section>
        <motion.div
          {...reveal}
          className="grid items-center gap-8 rounded-3xl border border-border bg-card p-8 shadow-soft md:grid-cols-2 md:p-12"
        >
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
              <PackageCheck className="h-6 w-6" />
            </div>
            <h2 className="mt-5 font-display text-2xl font-extrabold tracking-tight text-foreground">
              {t('home.dropoff_title')}
            </h2>
            <p className="mt-3 text-muted-fg">{t('home.dropoff_text')}</p>
            <div className="mt-5 space-y-1.5 text-sm">
              <p className="flex items-center gap-2 text-foreground">
                <MapPin className="h-4 w-4 text-brand" /> {company.address}
              </p>
              <p className="text-muted-fg">
                <a href={`tel:${company.phone.replace(/\s/g, '')}`} className="hover:text-brand">
                  {company.phone}
                </a>
              </p>
            </div>
          </div>
          <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-brand-50 to-muted">
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-brand-700">
              <Store className="h-16 w-16" />
              <span className="font-display text-lg font-bold">Mini Market Bulgaria</span>
              <span className="text-sm text-muted-fg">Българска пекарна Хубенови</span>
            </div>
          </div>
        </motion.div>
      </Section>

      {/* ── Closing CTA ────────────────────────────────────────────────── */}
      <Section>
        <motion.div
          {...reveal}
          className="flex flex-col items-center gap-5 rounded-3xl border border-brand/20 bg-brand-50 p-10 text-center shadow-soft dark:bg-brand-50/20 md:p-14"
        >
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
            {lang === 'bg' ? 'Готови ли сте да изпратите?' : 'Ready to send a parcel?'}
          </h2>
          <p className="max-w-lg text-muted-fg">
            {lang === 'bg'
              ? 'Изчислете цена за секунди или проследете пратка с номер.'
              : 'Get a price in seconds, or track a parcel by number.'}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/quote">
              <Button size="lg" className="gap-2">
                {t('home.cta_quote')} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/track">
              <Button size="lg" variant="outline" className="gap-2">
                <Search className="h-4 w-4" /> {t('home.cta_track')}
              </Button>
            </Link>
          </div>
        </motion.div>
      </Section>
    </>
  );
}

/* ── Animated UK → BG route line ──────────────────────────────────────── */
function RouteLine({ lang }: { lang: 'bg' | 'en' }) {
  return (
    <div className="flex h-full flex-col justify-center rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
      <div className="flex items-center gap-3 sm:gap-5">
        <Endpoint code="UK" city={lang === 'bg' ? 'Манчестър' : 'Manchester'} />
        <div className="relative h-7 flex-1">
          <div className="absolute top-1/2 h-0 w-full -translate-y-1/2 border-t-2 border-dashed border-border" />
          <motion.div
            className="absolute left-0 top-1/2 h-0 -translate-y-1/2 border-t-2 border-brand"
            initial={{ width: '0%' }}
            whileInView={{ width: '100%' }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
          >
            <span className="absolute -right-3.5 -top-3.5 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-brand-fg shadow-soft">
              <Truck className="h-4 w-4" />
            </span>
          </motion.div>
        </div>
        <Endpoint code="BG" city={lang === 'bg' ? 'София · Пловдив' : 'Sofia · Plovdiv'} />
      </div>
      <p className="mt-5 text-center text-sm text-muted-fg">
        {lang === 'bg'
          ? 'Собствен бус всеки петък · до врата или офис на Еконт'
          : 'Our own van every Friday · to the door or an Econt office'}
      </p>
    </div>
  );
}

function Endpoint({ code, city }: { code: string; city: string }) {
  return (
    <div className="shrink-0 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 font-display text-sm font-extrabold text-brand-700">
        {code}
      </div>
      <p className="mt-1.5 text-xs font-medium text-foreground">{city}</p>
    </div>
  );
}
