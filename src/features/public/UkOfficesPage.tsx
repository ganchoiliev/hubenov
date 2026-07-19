/**
 * /uk-offices — the four physical UK receiving offices, presented for customers.
 * Data comes from src/lib/offices.ts (single source of truth). The central hub
 * is visually promoted: it is the ONLY ship-to address for online parcels and
 * the Friday departure point.
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { MapPin, ExternalLink, Truck, PackageCheck, ArrowRight, Phone, Luggage, Building2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { Section, ImageHero } from '@/components/shared/common';
import { Stagger, StaggerItem } from '@/components/motion';
import { OFFICES, officeMapsUrl } from '@/lib/offices';
import { company } from '@/lib/env';

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.5, ease: 'easeOut' as const },
};

export function UkOfficesPage() {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';

  const L =
    lang === 'bg'
      ? {
          eyebrow: '4 адреса · Англия и Уелс',
          title: 'Нашите офиси в Обединеното кралство',
          subtitle:
            'Донесете пратката си в който и да е от четирите ни офиса — бусът тръгва към България всеки петък.',
          hub_badge: 'Главен склад',
          hub_note: 'Оттук тръгва бусът всеки петък',
          maps: 'Отвори в Google Maps',
          online_title: 'Поръчки от Amazon и UK магазини',
          online_text:
            'Онлайн пратки се доставят единствено на централния адрес: 542 Liverpool Road, Eccles, Manchester M30 7JA. Останалите офиси приемат само лично донесени пратки.',
          from_bg_title: 'Изпращаш от България?',
          from_bg_text: 'Виж как да изпратиш багаж от България и в кой от офисите да го получиш.',
          from_bg_cta: 'Как се изпраща от България',
          cta_quote: 'Изчисли цена',
          cta_contact: 'Свържи се с нас',
        }
      : {
          eyebrow: '4 locations · England & Wales',
          title: 'Our offices in the United Kingdom',
          subtitle: 'Bring your parcel to any of our four offices — the van leaves for Bulgaria every Friday.',
          hub_badge: 'Main depot',
          hub_note: 'The van departs from here every Friday',
          maps: 'Open in Google Maps',
          online_title: 'Amazon & UK shop orders',
          online_text:
            'Online parcels ship ONLY to the central address: 542 Liverpool Road, Eccles, Manchester M30 7JA. The other offices accept walk-in parcels only.',
          from_bg_title: 'Sending from Bulgaria?',
          from_bg_text: 'See how to send baggage from Bulgaria and which office to collect it at.',
          from_bg_cta: 'How to send from Bulgaria',
          cta_quote: 'Get a quote',
          cta_contact: 'Contact us',
        };

  return (
    <>
      <ImageHero
        image="/images/office-exterior.webp"
        eyebrow={
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25">
            <Building2 className="h-3.5 w-3.5" /> {L.eyebrow}
          </span>
        }
        title={L.title}
        subtitle={L.subtitle}
      />

      {/* ── Office cards ──────────────────────────────────────────────── */}
      <Section className="!py-14 md:!py-16">
        <Stagger className="grid gap-5 sm:grid-cols-2">
          {OFFICES.map((o) => (
            <StaggerItem key={o.slug}>
              <div
                className={
                  o.is_hub
                    ? 'relative h-full rounded-2xl border-2 border-brand bg-card p-6 shadow-lift'
                    : 'h-full rounded-2xl border border-border bg-card p-6 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift'
                }
              >
                {o.is_hub && (
                  <span className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-fg shadow-soft">
                    <Truck className="h-3 w-3" /> {L.hub_badge}
                  </span>
                )}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-extrabold text-foreground">
                      {lang === 'bg' ? o.name_bg : o.name_en}
                    </h2>
                    <p className="mt-0.5 text-sm text-muted-fg">{lang === 'bg' ? o.note_bg : o.note_en}</p>
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <MapPin className="h-5 w-5" />
                  </span>
                </div>
                <p className="mt-4 text-sm font-semibold text-foreground">{o.address}</p>
                <p className="text-sm text-muted-fg">
                  {o.city} · {o.postcode}
                </p>
                <a
                  href={officeMapsUrl(o)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition-colors hover:text-brand"
                >
                  {L.maps} <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        {/* Online-parcel rule — the one address that matters for Amazon etc. */}
        <motion.div
          {...reveal}
          className="mt-8 flex flex-col gap-4 rounded-2xl bg-brand p-6 text-brand-fg shadow-soft sm:flex-row sm:items-center"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <PackageCheck className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-base font-extrabold">{L.online_title}</p>
            <p className="mt-1 text-sm text-brand-fg/85">{L.online_text}</p>
          </div>
        </motion.div>
      </Section>

      {/* ── Cross-links ───────────────────────────────────────────────── */}
      <Section className="!pt-0 !pb-16">
        <motion.div
          {...reveal}
          className="grid items-center gap-6 rounded-3xl border border-border bg-muted/40 p-8 md:grid-cols-[1fr_auto]"
        >
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-extrabold text-foreground">
              <Luggage className="h-5 w-5 text-brand" /> {L.from_bg_title}
            </h2>
            <p className="mt-1.5 text-muted-fg">{L.from_bg_text}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
            <Link to="/bg-to-uk" className="block">
              <Button className="w-full gap-2">
                {L.from_bg_cta} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href={`tel:${company.phone.replace(/\s/g, '')}`} className="block">
              <Button variant="outline" className="w-full gap-2">
                <Phone className="h-4 w-4" /> {company.phone}
              </Button>
            </a>
          </div>
        </motion.div>
      </Section>
    </>
  );
}
