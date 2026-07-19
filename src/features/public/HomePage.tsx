import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { m as motion, useReducedMotion } from 'framer-motion';
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
  ShoppingBag,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { Stagger, StaggerItem } from '@/components/motion';
import { DepartureCountdown } from '@/components/shared/DepartureCountdown';
import { Section } from '@/components/shared/common';
import { ShopLogos } from '@/components/shared/ShopLogos';
import { company } from '@/lib/env';
import { OFFICES } from '@/lib/offices';

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

// Real customer reviews (from Facebook). Names as given by the customers.
const TESTIMONIALS = [
  {
    name: 'Мирослав Ангелов',
    bg: 'Силно препоръчвам. Много бърза доставка — за по-малко от 10 дни багажът беше получен.',
    en: 'Highly recommend. Very fast delivery — the parcel arrived in under 10 days.',
  },
  {
    name: 'Диана Янева',
    bg: 'Препоръчвам! Светкавична доставка — изпратена и получена на адреса в София за дни. Благодаря!',
    en: 'Recommend! Lightning-fast — sent and delivered to the door in Sofia within days. Thank you!',
  },
  {
    name: 'Яна Иванова',
    bg: 'Супер бързина в доставянето и без никакви повреди!',
    en: 'Super fast delivery and nothing damaged!',
  },
] as const;

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.5, ease: 'easeOut' as const },
};

export function HomePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';

  // Hero video: a lighter 126 KB file on mobile, the full one on desktop. The
  // still image is the poster either way, and reduced-motion users keep the still.
  const prefersReduced = useReducedMotion();
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  useEffect(() => {
    if (prefersReduced) {
      setVideoSrc(null);
      return;
    }
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = () => setVideoSrc(mq.matches ? '/video/hero.mp4' : '/video/hero-mobile.mp4');
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [prefersReduced]);

  return (
    <>
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      {/* Cinema-stack hero. One structure on every screen: the film runs
          full-width with NOTHING on it (100% visible, no scrims, no overlay
          collisions), and the content sits directly below it on the page
          background at native contrast. Desktop is the scaled-up version of
          the mobile layout; on wide screens the film's height is capped and
          object-cover trims the frame edges instead of covering it with UI. */}
      <section className="relative isolate overflow-hidden">
        <div className="relative aspect-video max-h-[70vh] min-h-[260px] w-full overflow-hidden">
          {/* Poster/backdrop with a gradient fallback. */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950"
            style={{ backgroundImage: "url('/images/hero-van.webp')", backgroundSize: 'cover', backgroundPosition: 'center' }}
          />
          {videoSrc && (
            <video
              key={videoSrc}
              className="absolute inset-0 h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster="/images/hero-van.webp"
              aria-hidden="true"
            >
              <source src={videoSrc} type="video/mp4" />
            </video>
          )}
        </div>

        {/* Transit ribbon — the film's "lower third": leaves Friday, in Bulgaria
            in 2–3 days. A solid band on its own surface, never over the film. */}
        <TransitRibbon lang={lang} />

        <div className="container pb-12 pt-7 md:pb-16 md:pt-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl"
          >
            <Link
              to="/uk-offices"
              className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 transition-colors hover:border-brand/40"
            >
              <Store className="h-3.5 w-3.5" />
              {lang === 'bg' ? '4 офиса в UK — виж адресите' : '4 UK offices — see addresses'}
              <ArrowRight className="h-3 w-3" />
            </Link>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground md:text-5xl">
              {t('home.hero_title')}
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted-fg">{t('home.hero_subtitle')}</p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link to="/quote" className="block sm:w-auto">
                <Button size="lg" className="w-full gap-2 sm:w-auto">
                  {t('home.cta_quote')} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/track" className="block sm:w-auto">
                <Button size="lg" variant="outline" className="w-full gap-2 sm:w-auto">
                  <Search className="h-4 w-4" /> {t('home.cta_track')}
                </Button>
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-foreground/80">
              {[
                lang === 'bg' ? 'от £2/кг · мин. £20' : 'from £2/kg · £20 min',
                lang === 'bg' ? 'Курс всеки петък' : 'A van every Friday',
                lang === 'bg' ? 'Приемане в Манчестър' : 'Drop-off in Manchester',
                lang === 'bg' ? 'Онлайн проследяване' : 'Online tracking',
              ].map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" /> {s}
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
              <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift">
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

      {/* ── Shop UK → ship to BG (Amazon forwarding) ───────────────────── */}
      <section className="border-b border-border bg-gradient-to-br from-brand-50 to-card dark:from-brand-50/20">
        <div className="container py-16 md:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <motion.div {...reveal}>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-card px-3 py-1 text-xs font-semibold text-brand-700">
                <ShoppingBag className="h-3.5 w-3.5" />
                {lang === 'bg' ? 'Купувай в UK, получавай в БГ' : 'Shop in the UK, receive in BG'}
              </span>
              <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                {lang === 'bg'
                  ? 'Поръчвай от Amazon и любимите си UK магазини'
                  : 'Order from Amazon & your favourite UK shops'}
              </h2>
              <p className="mt-4 text-lg text-muted-fg">
                {lang === 'bg'
                  ? 'Използвай нашия адрес в Манчестър като адрес за доставка. Получаваме колета вместо теб и го изпращаме до офис на Еконт в България — с нашия бус всеки петък.'
                  : 'Use our Manchester address as your delivery address. We receive the parcel for you and forward it to an Econt office in Bulgaria — on our own van every Friday.'}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link to="/quote" className="block sm:w-auto">
                  <Button size="lg" className="w-full gap-2 sm:w-auto">
                    {t('home.cta_quote')} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/contact" className="block sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full gap-2 sm:w-auto">
                    {lang === 'bg' ? 'Попитай как' : 'Ask how it works'}
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.1 }} className="space-y-3">
              {[
                {
                  icon: ShoppingBag,
                  title: lang === 'bg' ? '1 · Поръчай до нашия адрес' : '1 · Order to our address',
                  text:
                    lang === 'bg'
                      ? 'Въведи адреса ни в Манчестър при поръчка от Amazon, eBay, ASOS и др.'
                      : 'Enter our Manchester address at checkout on Amazon, eBay, ASOS, etc.',
                },
                {
                  icon: PackageCheck,
                  title: lang === 'bg' ? '2 · Получаваме и обработваме' : '2 · We receive & process',
                  text:
                    lang === 'bg'
                      ? 'Сканираме колета, добавяме го към твоя профил и подготвяме етикет.'
                      : 'We scan the parcel, link it to your account and prepare the label.',
                },
                {
                  icon: Truck,
                  title: lang === 'bg' ? '3 · Доставяме до България' : '3 · We deliver to Bulgaria',
                  text:
                    lang === 'bg'
                      ? 'С нашия бус в петък — до избран от теб офис на Еконт.'
                      : 'On our Friday van — to the Econt office you choose.',
                },
              ].map((s) => (
                <div key={s.title} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-display text-base font-bold text-foreground">{s.title}</p>
                    <p className="mt-0.5 text-sm text-muted-fg">{s.text}</p>
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-brand-fg">
                <MapPin className="h-4 w-4 shrink-0" />
                {lang === 'bg' ? 'Адрес за доставка:' : 'Ship-to address:'}
                <span className="font-normal">{company.address}</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Shops you can order from ───────────────────────────────────── */}
      <Section className="!py-14">
        <motion.div {...reveal}>
          <h2 className="text-center font-display text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
            {lang === 'bg' ? 'Пазарувай от UK магазини' : 'Shop from UK stores'}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted-fg">
            {lang === 'bg'
              ? 'Поръчай от тези и хиляди други UK магазини — ние ги доставяме до България. Натисни лого, за да отвориш магазина.'
              : 'Order from these and thousands of other UK shops — we deliver them to Bulgaria. Tap a logo to open the shop.'}
          </p>
          <div className="mt-8">
            <ShopLogos />
          </div>
        </motion.div>
      </Section>

      {/* ── Testimonials ────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-muted/40">
        <div className="container py-16 md:py-20">
          <motion.h2
            {...reveal}
            className="text-center font-display text-3xl font-extrabold tracking-tight text-foreground"
          >
            {lang === 'bg' ? 'Какво казват клиентите' : 'What customers say'}
          </motion.h2>
          <Stagger className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((q) => (
              <StaggerItem key={q.name}>
                <figure className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-soft">
                  <div className="flex gap-0.5 text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-foreground">“{q[lang]}”</blockquote>
                  <figcaption className="mt-4 text-sm font-semibold text-muted-fg">— {q.name}</figcaption>
                </figure>
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
            <ul className="mt-5 space-y-2 text-sm">
              {OFFICES.map((o) => (
                <li key={o.slug} className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <span className="min-w-0">
                    <span className="font-semibold text-foreground">
                      {lang === 'bg' ? o.name_bg : o.name_en}
                    </span>{' '}
                    <span className="text-muted-fg">
                      · {o.address}, {o.postcode}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted-fg">
              <a href={`tel:${company.phone.replace(/\s/g, '')}`} className="hover:text-brand">
                {company.phone}
              </a>
            </p>
          </div>
          <div className="aspect-[4/3] overflow-hidden rounded-2xl">
            <img
              src="/images/office-exterior.webp"
              alt={lang === 'bg' ? 'Нашият офис в Манчестър — зона за приемане на колети' : 'Our Manchester office — customer loading area'}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          </div>
        </motion.div>
      </Section>

      {/* ── Closing CTA ────────────────────────────────────────────────── */}
      <Section>
        <motion.div
          {...reveal}
          className="flex flex-col items-center gap-5 rounded-3xl border border-brand/20 bg-brand-50 p-10 text-center shadow-soft dark:border-brand/40 dark:bg-brand-50/20 md:p-14"
        >
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
            {lang === 'bg' ? 'Готови ли сте да изпратите?' : 'Ready to send a parcel?'}
          </h2>
          <p className="max-w-lg text-muted-fg">
            {lang === 'bg'
              ? 'Изчислете цена за секунди или проследете пратка с номер.'
              : 'Get a price in seconds, or track a parcel by number.'}
          </p>
          <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
            <Link to="/quote" className="block sm:w-auto">
              <Button size="lg" className="w-full gap-2 sm:w-auto">
                {t('home.cta_quote')} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/track" className="block sm:w-auto">
              <Button size="lg" variant="outline" className="w-full gap-2 sm:w-auto">
                <Search className="h-4 w-4" /> {t('home.cta_track')}
              </Button>
            </Link>
          </div>
        </motion.div>
      </Section>
    </>
  );
}

/* ── Transit ribbon under the hero film ───────────────────────────────── */
/** Broadcast-style lower third: departs Friday → in Bulgaria in 2–3 days,
 *  with a truck that keeps making the run. Solid brand surface, white text. */
function TransitRibbon({ lang }: { lang: 'bg' | 'en' }) {
  const reduced = useReducedMotion();
  return (
    <div className="relative z-10 bg-gradient-to-r from-brand-700 via-brand-600 to-emerald-700 text-white">
      <div className="container flex items-center gap-3 py-3 sm:gap-6 md:py-3.5">
        <div className="shrink-0">
          <p className="whitespace-nowrap font-display text-sm font-extrabold uppercase tracking-wide sm:text-base">
            {lang === 'bg' ? 'Всеки петък' : 'Every Friday'}
          </p>
          <p className="whitespace-nowrap text-[11px] font-medium text-white/75 sm:text-xs">
            {lang === 'bg' ? 'тръгва от Манчестър' : 'departs Manchester'}
          </p>
        </div>

        <div className="relative h-8 min-w-0 flex-1" aria-hidden="true">
          <div className="absolute top-1/2 w-full -translate-y-1/2 border-t-2 border-dashed border-white/30" />
          {reduced ? (
            <div className="absolute top-1/2 w-full -translate-y-1/2 border-t-2 border-white/80" />
          ) : (
            <motion.div
              className="absolute left-0 top-1/2 -translate-y-1/2 border-t-2 border-white"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 3.2, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.9 }}
            >
              <span className="absolute -right-3.5 -top-3.5 flex h-7 w-7 items-center justify-center rounded-full bg-white text-brand-700 shadow-soft">
                <Truck className="h-4 w-4" />
              </span>
            </motion.div>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p className="whitespace-nowrap font-display text-sm font-extrabold uppercase tracking-wide sm:text-base">
            {lang === 'bg' ? 'само 2–3 дни' : 'just 2–3 days'}
          </p>
          <p className="whitespace-nowrap text-[11px] font-medium text-white/75 sm:text-xs">
            {lang === 'bg' ? 'доставка в България' : 'delivery in Bulgaria'}
          </p>
        </div>
      </div>
    </div>
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
          ? 'Собствен бус всеки петък · доставка до офис на Еконт'
          : 'Our own van every Friday · delivery to an Econt office'}
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
