/**
 * /bg-office — the Bulgarian drop-off point for BG → UK baggage.
 * One Econt office (Гоце Делчев · Панаирски ливади) with a named recipient;
 * every parcel sent there is collected on Tuesday and arrives in Manchester
 * on Friday the same week. The full how-to lives at /bg-to-uk.
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { MapPin, Phone, Copy, ExternalLink, CalendarDays, Truck, ArrowRight, PenLine } from 'lucide-react';
import { Button } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { Section, PageHeading } from '@/components/shared/common';
import { BG_DROPOFF } from '@/lib/offices';

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.5, ease: 'easeOut' as const },
};

export function BgOfficePage() {
  const { i18n } = useTranslation();
  const toast = useToast();
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';

  const L =
    lang === 'bg'
      ? {
          title: 'Офис в България',
          subtitle: 'Адресът, на който изпращате багаж от България към Англия — чрез всеки офис на Еконт.',
          card_head: 'Адрес за изпращане · България → Англия',
          office_label: 'Еконт офис',
          city_label: 'Град',
          recipient_label: 'Получател',
          phone_label: 'Телефон',
          copy: 'Копирай адреса',
          copied: 'Адресът е копиран.',
          maps: 'Google Maps',
          how_title: 'Как работи',
          how_1: 'Изпращате багажа от който и да е офис на Еконт в България до нашия офис в Гоце Делчев.',
          how_2: 'Събираме всички пратки всеки вторник.',
          how_3: 'Багажът пристига в офиса ни в Манчестър в петък от същата седмица.',
          tue: 'Вторник',
          tue_note: 'Еконт събира пратките',
          fri: 'Петък',
          fri_note: 'Багажът е в Манчестър',
          label_title: 'Задължително надпишете багажа',
          label_1: 'Офис на получаване — Манчестър, Бърнли или Честър',
          label_2: 'Трите имена на получателя',
          label_3: 'Английски телефон за връзка',
          guide_cta: 'Виж пълните указания',
        }
      : {
          title: 'Office in Bulgaria',
          subtitle: 'The address for sending baggage from Bulgaria to the UK — via any Econt office.',
          card_head: 'Send-to address · Bulgaria → UK',
          office_label: 'Econt office',
          city_label: 'City',
          recipient_label: 'Recipient',
          phone_label: 'Phone',
          copy: 'Copy address',
          copied: 'Address copied.',
          maps: 'Google Maps',
          how_title: 'How it works',
          how_1: 'Send your baggage from any Econt office in Bulgaria to our office in Gotse Delchev.',
          how_2: 'We collect all parcels every Tuesday.',
          how_3: 'Your baggage arrives at our Manchester office on Friday the same week.',
          tue: 'Tuesday',
          tue_note: 'Econt collects the parcels',
          fri: 'Friday',
          fri_note: 'Baggage is in Manchester',
          label_title: 'You must write on the baggage',
          label_1: 'Collection office — Manchester, Burnley or Chester',
          label_2: 'The recipient’s full name',
          label_3: 'A UK contact phone number',
          guide_cta: 'See the full guide',
        };

  const copyText =
    lang === 'bg'
      ? `${BG_DROPOFF.office_bg}, гр. ${BG_DROPOFF.city_bg}\nПолучател: ${BG_DROPOFF.recipient}\nТелефон: ${BG_DROPOFF.phone}`
      : `${BG_DROPOFF.office_en}, ${BG_DROPOFF.city_en}\nRecipient: ${BG_DROPOFF.recipient}\nPhone: ${BG_DROPOFF.phone}`;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      toast.success(L.copied);
    } catch {
      /* clipboard unavailable (http/permissions) — the address stays visible on screen */
    }
  };

  const rows = [
    { label: L.office_label, value: lang === 'bg' ? BG_DROPOFF.office_bg : BG_DROPOFF.office_en, strong: true },
    { label: L.city_label, value: lang === 'bg' ? `гр. ${BG_DROPOFF.city_bg}` : BG_DROPOFF.city_en, strong: false },
    { label: L.recipient_label, value: BG_DROPOFF.recipient, strong: true },
  ];

  return (
    <Section className="!py-12 md:!py-16">
      <PageHeading title={L.title} subtitle={L.subtitle} />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* ── The address, styled like a shipping label ─────────────────── */}
        <motion.div {...reveal} className="overflow-hidden rounded-3xl border-2 border-brand/30 bg-card shadow-lift">
          <div className="flex items-center gap-2 bg-brand px-6 py-3.5 text-brand-fg">
            <MapPin className="h-4 w-4" />
            <p className="font-display text-sm font-extrabold uppercase tracking-wide">{L.card_head}</p>
          </div>
          <div className="space-y-5 p-6 sm:p-8">
            {rows.map((r) => (
              <div key={r.label}>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">{r.label}</p>
                <p
                  className={
                    r.strong
                      ? 'mt-1 font-display text-xl font-extrabold text-foreground'
                      : 'mt-1 text-base font-medium text-foreground'
                  }
                >
                  {r.value}
                </p>
              </div>
            ))}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">{L.phone_label}</p>
              <a
                href={`tel:${BG_DROPOFF.phone.replace(/\s/g, '')}`}
                className="mt-1 inline-flex items-center gap-2 font-display text-xl font-extrabold text-brand-700 transition-colors hover:text-brand"
              >
                <Phone className="h-5 w-5" /> {BG_DROPOFF.phone}
              </a>
            </div>
            <div className="flex flex-col gap-2.5 border-t border-border pt-5 sm:flex-row">
              <Button onClick={onCopy} className="w-full gap-2 sm:w-auto">
                <Copy className="h-4 w-4" /> {L.copy}
              </Button>
              <a href={BG_DROPOFF.mapsUrl} target="_blank" rel="noopener noreferrer" className="block sm:w-auto">
                <Button variant="outline" className="w-full gap-2">
                  {L.maps} <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </motion.div>

        {/* ── Schedule + labelling rules ────────────────────────────────── */}
        <div className="space-y-5">
          <motion.div
            {...reveal}
            transition={{ ...reveal.transition, delay: 0.08 }}
            className="rounded-2xl border border-border bg-card p-6 shadow-soft"
          >
            <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-foreground">
              <CalendarDays className="h-5 w-5 text-brand" /> {L.how_title}
            </h2>
            <ol className="mt-4 space-y-3">
              {[L.how_1, L.how_2, L.how_3].map((s, i) => (
                <li key={s} className="flex items-start gap-3 text-sm text-muted-fg">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-50 font-display text-xs font-extrabold text-brand-700">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>

            {/* Tuesday → Friday mini-route */}
            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-muted/50 p-4">
              <div className="shrink-0 text-center">
                <p className="font-display text-sm font-extrabold text-foreground">{L.tue}</p>
                <p className="text-[11px] text-muted-fg">{L.tue_note}</p>
              </div>
              <div className="relative h-6 min-w-0 flex-1">
                <div className="absolute top-1/2 w-full -translate-y-1/2 border-t-2 border-dashed border-border" />
                <motion.div
                  className="absolute left-0 top-1/2 -translate-y-1/2 border-t-2 border-brand"
                  initial={{ width: '0%' }}
                  whileInView={{ width: '100%' }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.1, ease: 'easeInOut' }}
                >
                  <span className="absolute -right-3 -top-3 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-brand-fg shadow-soft">
                    <Truck className="h-3.5 w-3.5" />
                  </span>
                </motion.div>
              </div>
              <div className="shrink-0 text-center">
                <p className="font-display text-sm font-extrabold text-foreground">{L.fri}</p>
                <p className="text-[11px] text-muted-fg">{L.fri_note}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            {...reveal}
            transition={{ ...reveal.transition, delay: 0.16 }}
            className="rounded-2xl border border-amber-300/60 bg-amber-50 p-6 shadow-soft dark:border-amber-400/30 dark:bg-amber-400/10"
          >
            <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-foreground">
              <PenLine className="h-5 w-5 text-amber-600" /> {L.label_title}
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-foreground/85">
              {[L.label_1, L.label_2, L.label_3].map((s) => (
                <li key={s} className="flex items-start gap-2">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  {s}
                </li>
              ))}
            </ul>
            <Link to="/bg-to-uk" className="mt-4 inline-block">
              <Button variant="outline" className="gap-2">
                {L.guide_cta} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </Section>
  );
}
