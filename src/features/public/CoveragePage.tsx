import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Truck, MapPin, PackageCheck, DoorOpen, Store, ArrowRight, Globe2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { Stagger, StaggerItem } from '@/components/motion';
import { Section, ImageHero } from '@/components/shared/common';

interface CityEntry {
  bg: string;
  en: string;
}

const CITIES: readonly CityEntry[] = [
  { bg: 'София', en: 'Sofia' },
  { bg: 'Пловдив', en: 'Plovdiv' },
  { bg: 'Варна', en: 'Varna' },
  { bg: 'Бургас', en: 'Burgas' },
  { bg: 'Русе', en: 'Ruse' },
  { bg: 'Стара Загора', en: 'Stara Zagora' },
  { bg: 'Плевен', en: 'Pleven' },
  { bg: 'Велико Търново', en: 'Veliko Tarnovo' },
  { bg: 'Благоевград', en: 'Blagoevgrad' },
] as const;

const COPY_BG = {
  subtitle:
    'Собствен транспорт от Манчестър до България — всеки петък. Последна миля с Еконт до всяко населено място в страната.',
  ownTitle: 'Собствен курс Манчестър → България',
  ownText:
    'Превозваме сами, със собствен бус, всеки петък. Без презастраховане при подизпълнители — пратката ви е в наши ръце по целия път до България.',
  econtTitle: 'Доставка с Еконт до цяла България',
  econtText:
    'След пристигане предаваме на Еконт за последна миля — до всеки град и село в страната.',
  doorTitle: 'До врата',
  doorText: 'Куриерът доставя директно на посочения адрес на получателя.',
  officeTitle: 'До офис на Еконт',
  officeText: 'Получаване от удобен офис на Еконт в избрания град.',
  citiesTitle: 'Градове, които обслужваме',
  citiesText: 'Това са само част от по-големите дестинации — доставяме навсякъде.',
  allTitle: 'Цяла България',
  allText: 'Всяко населено място — врата или офис, без изключения.',
  ctaTitle: 'Готови да изпратите?',
  ctaText: 'Изчислете ориентировъчна цена за секунди и запишете пратката за следващия петък.',
  ctaButton: 'Изчисли цена',
} as const;

const COPY_EN = {
  subtitle:
    'Our own transport from Manchester to Bulgaria — every Friday. Econt last-mile delivery to every town and village in the country.',
  ownTitle: 'Own run Manchester → Bulgaria',
  ownText:
    'We carry it ourselves, in our own van, every Friday. No re-handing to subcontractors — your parcel stays in our hands all the way to Bulgaria.',
  econtTitle: 'Econt delivery across all of Bulgaria',
  econtText:
    'On arrival we hand over to Econt for the last mile — to every city and village in the country.',
  doorTitle: 'To the door',
  doorText: "The courier delivers straight to the recipient's address.",
  officeTitle: 'To an Econt office',
  officeText: 'Collect from a convenient Econt office in the chosen town.',
  citiesTitle: 'Cities we serve',
  citiesText: 'These are just some of the larger destinations — we deliver everywhere.',
  allTitle: 'All of Bulgaria',
  allText: 'Every settlement — door or office, no exceptions.',
  ctaTitle: 'Ready to send?',
  ctaText: 'Get an instant estimate in seconds and book your parcel for the next Friday run.',
  ctaButton: 'Get a quote',
} as const;

const PILLARS = [
  { icon: Truck, titleKey: 'ownTitle', textKey: 'ownText' },
  { icon: PackageCheck, titleKey: 'econtTitle', textKey: 'econtText' },
] as const;

const MODES = [
  { icon: DoorOpen, titleKey: 'doorTitle', textKey: 'doorText' },
  { icon: Store, titleKey: 'officeTitle', textKey: 'officeText' },
] as const;

export function CoveragePage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const L = locale === 'bg' ? COPY_BG : COPY_EN;

  return (
    <>
      <ImageHero image="/images/hero-van.png" title={t('nav.coverage')} subtitle={L.subtitle} />
      <Section>
        {/* Two transport pillars */}
      <Stagger className="grid gap-5 md:grid-cols-2">
        {PILLARS.map((p) => (
          <StaggerItem key={p.titleKey}>
            <div className="h-full rounded-2xl border border-border bg-card p-7 shadow-soft transition-shadow hover:shadow-lift">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <p.icon className="h-6 w-6" />
              </div>
              <h2 className="mt-5 font-display text-xl font-extrabold tracking-tight text-foreground">
                {L[p.titleKey]}
              </h2>
              <p className="mt-2 text-muted-fg">{L[p.textKey]}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>

      {/* Door / office modes */}
      <Stagger className="mt-5 grid gap-5 sm:grid-cols-2">
        {MODES.map((m) => (
          <StaggerItem key={m.titleKey}>
            <div className="flex h-full items-start gap-4 rounded-2xl border border-border bg-muted/40 p-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <m.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-foreground">{L[m.titleKey]}</h3>
                <p className="mt-1 text-sm text-muted-fg">{L[m.textKey]}</p>
              </div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>

      {/* Cities served */}
      <div className="mt-14">
        <h2 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
          {L.citiesTitle}
        </h2>
        <p className="mt-1.5 text-sm text-muted-fg">{L.citiesText}</p>

        <Stagger className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CITIES.map((c) => (
            <StaggerItem key={c.en}>
              <div className="flex h-full items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft transition-shadow hover:shadow-lift">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-display text-base font-bold text-foreground">
                    {locale === 'bg' ? c.bg : c.en}
                  </p>
                  <p className="truncate text-xs text-muted-fg">{locale === 'bg' ? c.en : c.bg}</p>
                </div>
              </div>
            </StaggerItem>
          ))}

          {/* All of Bulgaria — highlighted */}
          <StaggerItem>
            <div className="flex h-full items-center gap-3 rounded-2xl border border-brand/20 bg-brand-50 p-4 shadow-soft">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-fg">
                <Globe2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-base font-extrabold text-brand-700">
                  {L.allTitle}
                </p>
                <p className="truncate text-xs text-brand-700/80">{L.allText}</p>
              </div>
            </div>
          </StaggerItem>
        </Stagger>
      </div>

      {/* CTA */}
      <div className="mt-14 flex flex-col items-start gap-5 rounded-3xl border border-border bg-card p-8 shadow-soft md:flex-row md:items-center md:justify-between md:p-10">
        <div>
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
            {L.ctaTitle}
          </h2>
          <p className="mt-2 max-w-xl text-muted-fg">{L.ctaText}</p>
        </div>
        <Link to="/quote" className="shrink-0">
          <Button size="lg" className="gap-2">
            {L.ctaButton} <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
      </Section>
    </>
  );
}
