import { Link } from 'react-router-dom';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { m as motion, useMotionTemplate, useMotionValue, useReducedMotion } from 'framer-motion';
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

// Verbatim Google reviews from the public business profile (5.0, 9 reviews
// at time of writing). Quoted exactly as written, in the reviewer's own
// language, and the section links to the profile so anyone can verify.
// No stars, no invented names, nothing self-hosted: proof lives on Google.
export const GOOGLE_PROFILE_URL = 'https://share.google/pvs9tdmDUBcKyG3KK';
const GOOGLE_REVIEWS = [
  {
    name: 'Ilian Todorov',
    text: 'I received a top notch service - two speedy deliveries to Bulgaria. The business is run by a friendly owner, and their Manchester office has corteus staff. They also offer home collection, which I used.',
  },
  {
    name: 'Mihail Velkov',
    text: 'Перфектни, благодарим за коректността и точността!',
  },
  {
    name: 'Vanya Veleva',
    text: 'Preporachvam na vseki da polzva tazi companiq 💯',
  },
] as const;

// Content renders visible. Scroll-triggered opacity-0 reveals were removed:
// crawlers/AI agents (and the build-time prerender) must see the text, and
// blank viewports mid-scroll read as broken. Only route lines animate.
const reveal = { transition: { duration: 0.2, ease: 'easeOut' as const } };

export function HomePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';

  // Hero film: a seamless 3-scene loop of the fleet (the same white Actros as
  // the shop-front poster). The still is the LCP element and the poster; the
  // film is attached only after `load`, picks a 640px file on phones and the
  // 1280px file on desktop, and is skipped entirely for reduced-motion users
  // and for Save-Data connections.
  const prefersReduced = useReducedMotion();
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (prefersReduced) return;
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    if (nav.connection?.saveData) return;
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = () => setVideoSrc(mq.matches ? '/video/hero-loop.mp4' : '/video/hero-loop-mobile.mp4');
    let t: number | undefined;
    const start = () => {
      t = window.setTimeout(() => {
        apply();
        mq.addEventListener('change', apply);
      }, 300);
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    return () => {
      window.removeEventListener('load', start);
      mq.removeEventListener('change', apply);
      window.clearTimeout(t);
    };
  }, [prefersReduced]);

  return (
    <>
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      {/* Fleet hero: the white Mercedes Actros with the dark-red HUBENOV /
          ДОСТАВКИ livery from the owner's shop-window poster, so the site and
          the shop front show the same truck. The still is the first frame of
          the loop (yard, van, pallets) so the film attaches without a jump;
          hero-fleet-alt-road is the poster/OG shot. Rendered photoreal
          (overcast Manchester, UK plates, grime) so it does not read as stock
          art. Full-width, nothing over it; content sits below. */}
      <section className="relative isolate overflow-hidden">
        <div className="relative aspect-[16/9] max-h-[70vh] min-h-[260px] w-full overflow-hidden bg-slate-900">
          <img
            src="/images/hero-fleet-1600.webp"
            srcSet="/images/hero-fleet-800.webp 800w, /images/hero-fleet-1600.webp 1600w"
            sizes="100vw"
            alt={
              lang === 'bg'
                ? 'Камионът и бусът на Доставки Хубенов в двора в Манчестър — колети за България всеки петък'
                : 'Hubenov Delivery lorry and van in the Manchester yard — parcels to Bulgaria every Friday'
            }
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover object-[50%_55%]"
          />
          {videoSrc && (
            <video
              key={videoSrc}
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover object-[50%_55%]"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster="/images/hero-fleet-1600.webp"
              aria-hidden="true"
              disablePictureInPicture
            >
              <source src={videoSrc.replace('.mp4', '.webm')} type="video/webm" />
              <source src={videoSrc} type="video/mp4" />
            </video>
          )}
        </div>

        {/* Transit ribbon — the film's "lower third": leaves Friday, in Bulgaria
            in 2–3 days. A solid band on its own surface, never over the film. */}
        <TransitRibbon lang={lang} videoRef={videoRef} />

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

      {/* ── Reviews (Google) ────────────────────────────────────────────── */}
      <section className="border-y border-border bg-muted/40">
        <div className="container py-16 md:py-20">
          <div className="flex flex-col items-center gap-3 text-center">
            <a
              href={GOOGLE_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:border-brand/40"
            >
              <GoogleG className="h-3.5 w-3.5" />
              5.0 · {lang === 'bg' ? '9 отзива в Google' : '9 Google reviews'}
            </a>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
              {lang === 'bg' ? 'Какво казват клиентите' : 'What customers say'}
            </h2>
            <p className="max-w-xl text-sm text-muted-fg">
              {lang === 'bg'
                ? 'Цитирани дословно от публичния ни профил в Google — на езика, на който са написани.'
                : 'Quoted word for word from our public Google profile, in the language they were written in.'}
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-3">
            {GOOGLE_REVIEWS.map((q) => (
              <figure key={q.name} className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-soft">
                <blockquote className="flex-1 text-sm leading-relaxed text-foreground">“{q.text}”</blockquote>
                <figcaption className="mt-4 flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-foreground">{q.name}</span>
                  <a
                    href={GOOGLE_PROFILE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-fg hover:text-brand"
                  >
                    <GoogleG className="h-3 w-3" /> Google
                  </a>
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-8 text-center text-sm">
            <a
              href={GOOGLE_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand hover:underline"
            >
              {lang === 'bg' ? 'Всички отзиви в Google →' : 'All reviews on Google →'}
            </a>
          </p>
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
/** Broadcast-style lower third: departs Friday → in Bulgaria in 2–3 days.
 *  The truck's progress is driven by the hero film itself (currentTime /
 *  duration, sampled every frame), so one full crossing = one full loop of
 *  the scenes and the two never drift. Before the film attaches, or when it
 *  cannot play, a clock with the same period keeps the same pace. */
const LOOP_SECONDS = 14.75; // must match public/video/hero-loop.* duration
function TransitRibbon({ lang, videoRef }: { lang: 'bg' | 'en'; videoRef: RefObject<HTMLVideoElement | null> }) {
  const reduced = useReducedMotion();
  const progress = useMotionValue(0);
  const width = useMotionTemplate`${progress}%`;

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const v = videoRef.current;
      const p =
        v && v.duration > 0 && !v.paused && !v.ended
          ? v.currentTime / v.duration
          : ((now - t0) / 1000 % LOOP_SECONDS) / LOOP_SECONDS;
      progress.set(Math.min(100, Math.max(0, p * 100)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, progress, videoRef]);

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
              style={{ width }}
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
        <Endpoint code="BG" city={lang === 'bg' ? 'офис на Еконт' : 'Econt office'} />
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

/** Google "G" mark (brand colours) for review attribution. */
function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.7 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
      <path fill="#FBBC05" d="M10.5 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.1C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.7l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.3 0-11.6-4.2-13.5-10l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}
