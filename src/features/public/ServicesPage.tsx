import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Truck,
  Home,
  Building2,
  Gift,
  Package,
  Banknote,
  ArrowRight,
  Send,
  CalendarDays,
  PenLine,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { Stagger, StaggerItem } from '@/components/motion';
import { Section, ImageHero } from '@/components/shared/common';
import { cn } from '@/lib/utils';

type FeatureKey = 'door' | 'office' | 'cod' | 'gifts' | 'goods';

/** UK → BG card: titles come from i18n (services.*), descriptions from L. */
const UK_BG_FEATURES: Array<{ key: FeatureKey; icon: LucideIcon }> = [
  { key: 'door', icon: Home },
  { key: 'office', icon: Building2 },
  { key: 'cod', icon: Banknote },
  { key: 'gifts', icon: Gift },
  { key: 'goods', icon: Package },
];
// NOTE: the 'door' key now carries the "4 UK drop-off locations" copy and 'cod'
// the "pay by bank or in office" copy (i18n services.*) — keys kept stable.

type BgUkFeatureKey = 'econt_send' | 'tuesday' | 'friday' | 'collect' | 'label';

/** BG → UK card: direction-specific process (Econt → Гоце Делчев → Tue → Fri). */
const BG_UK_FEATURES: Array<{ key: BgUkFeatureKey; icon: LucideIcon }> = [
  { key: 'econt_send', icon: Send },
  { key: 'tuesday', icon: CalendarDays },
  { key: 'friday', icon: Truck },
  { key: 'collect', icon: Building2 },
  { key: 'label', icon: PenLine },
];

type DirectionKey = 'uk_bg' | 'bg_uk';

const DIRECTIONS: Array<{ key: DirectionKey; route: string; accent: string }> = [
  { key: 'uk_bg', route: 'Manchester → BG', accent: 'from-brand-50 to-card' },
  { key: 'bg_uk', route: 'BG → Manchester', accent: 'from-accent/10 to-card' },
];

export function ServicesPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';

  const L =
    locale === 'bg'
      ? {
          uk_bg_desc:
            'Седмичен курс със собствен бус от Манчестър до цяла България. Заявявате, носите колета в наш офис и ние се грижим за останалото.',
          bg_uk_desc:
            'Изпращате багажа през който и да е офис на Еконт до нашия офис в Гоце Делчев — събираме всеки вторник и в петък багажът е в Манчестър.',
          feature_desc: {
            door: 'Манчестър (2 офиса), Бърнли и Куинсфери — носите колета където ви е удобно.',
            office: 'Получавате пратката от избран от вас офис на Еконт — навсякъде в България.',
            cod: 'Плащане по банков път или на място в наш офис — просто и ясно.',
            gifts: 'Подаръци и лични пратки за роднини — третирани с грижа.',
            goods: 'Търговски стоки с придружаваща фактура и документация.',
          } satisfies Record<FeatureKey, string>,
          bg_uk_features: {
            econt_send: {
              title: 'Изпращане през Еконт',
              desc: 'От който и да е офис на Еконт — до нашия офис „Гоце Делчев — Панаирски ливади“, получател Богослав Хубенов.',
            },
            tuesday: {
              title: 'Събиране всеки вторник',
              desc: 'Всички пратки, изпратени чрез Еконт, се събират всеки вторник.',
            },
            friday: {
              title: 'В Манчестър в петък',
              desc: 'Багажът пристига в офиса ни в Манчестър в петък от същата седмица.',
            },
            collect: {
              title: 'Получаване в 3 офиса',
              desc: 'Манчестър, Бърнли или Честър — избирате при изпращане.',
            },
            label: {
              title: 'Надпишете багажа',
              desc: 'Върху всеки багаж: офис на получаване, три имена и английски телефон.',
            },
          } satisfies Record<BgUkFeatureKey, { title: string; desc: string }>,
          cta: 'Изчисли цена',
          cta_guide: 'Как се изпраща',
          included: 'Включва',
        }
      : {
          uk_bg_desc:
            'Weekly run with our own van from Manchester across Bulgaria. You book, drop the parcel at one of our offices, and we handle the rest.',
          bg_uk_desc:
            'Send via any Econt office to our office in Gotse Delchev — we collect every Tuesday and the baggage is in Manchester on Friday.',
          feature_desc: {
            door: 'Manchester (2 locations), Burnley and Queensferry — drop off wherever suits you.',
            office: 'Collect from the Econt office you choose — anywhere in Bulgaria.',
            cod: 'Pay by bank transfer or in person at our office — simple and clear.',
            gifts: 'Gifts and personal parcels for family — handled with care.',
            goods: 'Commercial goods with an accompanying invoice and paperwork.',
          } satisfies Record<FeatureKey, string>,
          bg_uk_features: {
            econt_send: {
              title: 'Send via Econt',
              desc: 'From any Econt office — to our office “Gotse Delchev — Panairski Livadi”, recipient Bogoslav Hubenov.',
            },
            tuesday: {
              title: 'Collected every Tuesday',
              desc: 'All parcels sent via Econt are collected every Tuesday.',
            },
            friday: {
              title: 'In Manchester on Friday',
              desc: 'Baggage arrives at our Manchester office on Friday the same week.',
            },
            collect: {
              title: 'Collect at 3 offices',
              desc: 'Manchester, Burnley or Chester — you choose when sending.',
            },
            label: {
              title: 'Label the baggage',
              desc: 'On every bag: collection office, full name and a UK phone number.',
            },
          } satisfies Record<BgUkFeatureKey, { title: string; desc: string }>,
          cta: 'Get a quote',
          cta_guide: 'How to send',
          included: 'Included',
        };

  return (
    <>
      <ImageHero
        image="/images/services-loading.webp"
        title={t('services.title')}
        subtitle={t('services.subtitle')}
      />
      <Section className="!pt-12">
        <Stagger className="grid gap-6 lg:grid-cols-2">
        {DIRECTIONS.map((dir) => (
          <StaggerItem key={dir.key} className="h-full">
            <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-shadow hover:shadow-lift">
              {/* Header */}
              <div className={cn('bg-gradient-to-br p-6 md:p-8', dir.accent)}>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-card/70 px-3 py-1 text-xs font-semibold text-brand-700 backdrop-blur">
                  <Truck className="h-3.5 w-3.5" /> {dir.route}
                </span>
                <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-foreground">
                  {t(`services.${dir.key}`)}
                </h2>
                <p className="mt-2 max-w-md text-sm text-muted-fg">
                  {dir.key === 'uk_bg' ? L.uk_bg_desc : L.bg_uk_desc}
                </p>
              </div>

              {/* Features */}
              <div className="flex flex-1 flex-col p-6 md:p-8 md:pt-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-fg">
                  {L.included}
                </p>
                <ul className="mt-4 space-y-4">
                  {dir.key === 'uk_bg'
                    ? UK_BG_FEATURES.map((f) => (
                        <li key={f.key} className="flex items-start gap-3.5">
                          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                            <f.icon className="h-5 w-5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-bold text-foreground">
                              {t(`services.${f.key}`)}
                            </span>
                            <span className="mt-0.5 block text-sm text-muted-fg">
                              {L.feature_desc[f.key]}
                            </span>
                          </span>
                        </li>
                      ))
                    : BG_UK_FEATURES.map((f) => (
                        <li key={f.key} className="flex items-start gap-3.5">
                          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                            <f.icon className="h-5 w-5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-bold text-foreground">
                              {L.bg_uk_features[f.key].title}
                            </span>
                            <span className="mt-0.5 block text-sm text-muted-fg">
                              {L.bg_uk_features[f.key].desc}
                            </span>
                          </span>
                        </li>
                      ))}
                </ul>

                <div className="mt-7 flex flex-col gap-2.5 pt-2 sm:flex-row">
                  {dir.key === 'bg_uk' ? (
                    <>
                      <Link to="/bg-to-uk" className="block flex-1">
                        <Button size="lg" className="w-full gap-2">
                          {L.cta_guide} <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link to="/bg-office" className="block flex-1">
                        <Button size="lg" variant="outline" className="w-full gap-2">
                          {locale === 'bg' ? 'Адресът в България' : 'The BG address'}
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <Link to="/quote" className="block w-full">
                      <Button size="lg" className="w-full gap-2">
                        {L.cta} <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </StaggerItem>
        ))}
        </Stagger>
      </Section>
    </>
  );
}
