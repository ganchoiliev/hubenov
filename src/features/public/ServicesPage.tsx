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
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { Stagger, StaggerItem } from '@/components/motion';
import { Section, PageHeading } from '@/components/shared/common';
import { cn } from '@/lib/utils';

type FeatureKey = 'door' | 'office' | 'cod' | 'gifts' | 'goods';

const FEATURES: Array<{ key: FeatureKey; icon: LucideIcon }> = [
  { key: 'door', icon: Home },
  { key: 'office', icon: Building2 },
  { key: 'cod', icon: Banknote },
  { key: 'gifts', icon: Gift },
  { key: 'goods', icon: Package },
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
            'Седмичен курс със собствен бус от Манчестър до цяла България. Заявявате, носите колета в магазина и ние се грижим за останалото.',
          bg_uk_desc:
            'Изпращайте колети и подаръци от България до Великобритания — със същата грижа и сигурен собствен транспорт.',
          feature_desc: {
            door: 'Доставка до адреса на получателя във всяко населено място.',
            office: 'Вземане от удобен офис на Еконт — без чакане вкъщи.',
            cod: 'Получателят плаща при доставка; ние превеждаме сумата.',
            gifts: 'Подаръци и лични пратки за роднини — третирани с грижа.',
            goods: 'Търговски стоки с придружаваща фактура и документация.',
          } satisfies Record<FeatureKey, string>,
          cta: 'Изчисли цена',
          included: 'Включва',
        }
      : {
          uk_bg_desc:
            'Weekly run with our own van from Manchester across Bulgaria. You book, drop the parcel at the shop, and we handle the rest.',
          bg_uk_desc:
            'Send parcels and gifts from Bulgaria to the UK — with the same care and secure own transport.',
          feature_desc: {
            door: 'Delivery to the recipient’s address in any town or village.',
            office: 'Pick-up from a convenient Econt office — no waiting at home.',
            cod: 'The recipient pays on delivery; we transfer the amount to you.',
            gifts: 'Gifts and personal parcels for family — handled with care.',
            goods: 'Commercial goods with an accompanying invoice and paperwork.',
          } satisfies Record<FeatureKey, string>,
          cta: 'Get a quote',
          included: 'Included',
        };

  return (
    <Section>
      <PageHeading title={t('services.title')} subtitle={t('services.subtitle')} />

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
                  {FEATURES.map((f) => (
                    <li key={f.key} className="flex items-start gap-3.5">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                        <f.icon className="h-4.5 w-4.5" />
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
                  ))}
                </ul>

                <div className="mt-7 pt-2">
                  <Link to="/quote" className="block">
                    <Button size="lg" className="w-full gap-2">
                      {L.cta} <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  );
}
