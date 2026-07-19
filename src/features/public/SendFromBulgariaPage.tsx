/**
 * /bg-to-uk — how to send baggage from Bulgaria to the UK.
 * Owner-supplied process, structured: (1) send via any Econt office to our
 * Гоце Делчев drop-off, (2) write three mandatory details on every bag,
 * (3) Tuesday collection → Friday arrival in Manchester. The "luggage tag"
 * card makes the mandatory labelling impossible to miss.
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import {
  Luggage,
  MapPin,
  Phone,
  PenLine,
  CalendarDays,
  Truck,
  ArrowRight,
  Building2,
  AlertTriangle,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { Section, ImageHero } from '@/components/shared/common';
import { Stagger, StaggerItem } from '@/components/motion';
import { BG_DROPOFF } from '@/lib/offices';
import { whatsappUrl } from '@/lib/contact';
import { WhatsAppIcon } from '@/components/brand/ContactIcons';

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.5, ease: 'easeOut' as const },
};

export function SendFromBulgariaPage() {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';

  const L =
    lang === 'bg'
      ? {
          eyebrow: 'България → Англия',
          title: 'Как да изпратиш багаж от България',
          subtitle: 'Три лесни стъпки — през който и да е офис на Еконт, до нашия склад в Манчестър.',
          s1_title: 'Изпрати през Еконт',
          s1_text: 'От който и да е офис на Еконт в България — до нашия адрес:',
          s1_recipient: 'Получател',
          s1_phone: 'Телефон',
          s2_title: 'Надпиши багажа',
          s2_text: 'Върху всеки багаж задължително изпиши трите данни от етикета вдясно — така пратката се обработва веднага.',
          s3_title: 'Получи го в Англия',
          s3_text: 'Събираме пратките всеки вторник. Багажът пристига в офиса ни в Манчестър в петък от същата седмица — получаваш го в избрания от теб офис.',
          tag_head: 'Напиши върху всеки багаж',
          tag_1_label: 'В кой офис ще получиш пратката',
          tag_1_value: 'Манчестър / Бърнли / Честър',
          tag_2_label: 'Трите имена на получателя',
          tag_2_value: 'напр. Иван Петров Иванов',
          tag_3_label: 'Английски телефон за връзка',
          tag_3_value: 'напр. +44 7xxx xxx xxx',
          tag_warn: 'Без тези данни обработката и получаването се забавят.',
          sched_title: 'График за транспортиране',
          sched_text: 'Всички пратки, изпратени чрез Еконт, се събират всеки вторник. Багажът пристига в офиса в Манчестър в петък от същата седмица.',
          tue: 'Вторник',
          tue_note: 'Еконт събира пратките',
          fri: 'Петък',
          fri_note: 'Багажът е в Манчестър',
          offices_cta: 'Виж офисите в UK',
          bg_office_cta: 'Адресът в България',
          help_title: 'Имаш въпрос?',
          help_text: 'Пиши ни в WhatsApp или се обади — отговаряме бързо.',
        }
      : {
          eyebrow: 'Bulgaria → United Kingdom',
          title: 'How to send baggage from Bulgaria',
          subtitle: 'Three easy steps — via any Econt office, to our Manchester depot.',
          s1_title: 'Send via Econt',
          s1_text: 'From any Econt office in Bulgaria — to our address:',
          s1_recipient: 'Recipient',
          s1_phone: 'Phone',
          s2_title: 'Label the baggage',
          s2_text: 'Write the three details from the tag on every bag — that way it is processed immediately.',
          s3_title: 'Collect it in the UK',
          s3_text: 'We collect parcels every Tuesday. Your baggage arrives at our Manchester office on Friday the same week — collect it at the office you chose.',
          tag_head: 'Write on every bag',
          tag_1_label: 'Which office you will collect at',
          tag_1_value: 'Manchester / Burnley / Chester',
          tag_2_label: 'The recipient’s full name',
          tag_2_value: 'e.g. Ivan Petrov Ivanov',
          tag_3_label: 'A UK contact phone number',
          tag_3_value: 'e.g. +44 7xxx xxx xxx',
          tag_warn: 'Missing details delay processing and collection.',
          sched_title: 'Transport schedule',
          sched_text: 'All parcels sent via Econt are collected every Tuesday. Baggage arrives at the Manchester office on Friday the same week.',
          tue: 'Tuesday',
          tue_note: 'Econt collects the parcels',
          fri: 'Friday',
          fri_note: 'Baggage is in Manchester',
          offices_cta: 'See our UK offices',
          bg_office_cta: 'The address in Bulgaria',
          help_title: 'Have a question?',
          help_text: 'Message us on WhatsApp or call — we reply fast.',
        };

  return (
    <>
      <ImageHero
        image="/images/van-loading.webp"
        eyebrow={
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25">
            <Luggage className="h-3.5 w-3.5" /> {L.eyebrow}
          </span>
        }
        title={L.title}
        subtitle={L.subtitle}
      />

      {/* ── Steps + luggage tag ───────────────────────────────────────── */}
      <Section className="!py-14 md:!py-16">
        <div className="grid items-start gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
          <Stagger className="space-y-5">
            {/* Step 1 — the address */}
            <StaggerItem>
              <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand font-display text-lg font-extrabold text-brand-fg shadow-soft">
                    1
                  </span>
                  <h2 className="font-display text-lg font-extrabold text-foreground">{L.s1_title}</h2>
                </div>
                <p className="mt-3 text-sm text-muted-fg">{L.s1_text}</p>
                <div className="mt-3 space-y-2 rounded-xl bg-muted/50 p-4 text-sm">
                  <p className="flex items-start gap-2 font-semibold text-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    {lang === 'bg' ? BG_DROPOFF.office_bg : BG_DROPOFF.office_en}
                  </p>
                  <p className="text-muted-fg">
                    {L.s1_recipient}: <span className="font-semibold text-foreground">{BG_DROPOFF.recipient}</span>
                  </p>
                  <p className="text-muted-fg">
                    {L.s1_phone}:{' '}
                    <a
                      href={`tel:${BG_DROPOFF.phone.replace(/\s/g, '')}`}
                      className="font-semibold text-brand-700 hover:text-brand"
                    >
                      {BG_DROPOFF.phone}
                    </a>
                  </p>
                </div>
                <Link
                  to="/bg-office"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition-colors hover:text-brand"
                >
                  {L.bg_office_cta} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </StaggerItem>

            {/* Step 2 — labelling */}
            <StaggerItem>
              <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand font-display text-lg font-extrabold text-brand-fg shadow-soft">
                    2
                  </span>
                  <h2 className="font-display text-lg font-extrabold text-foreground">{L.s2_title}</h2>
                </div>
                <p className="mt-3 text-sm text-muted-fg">{L.s2_text}</p>
              </div>
            </StaggerItem>

            {/* Step 3 — schedule */}
            <StaggerItem>
              <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand font-display text-lg font-extrabold text-brand-fg shadow-soft">
                    3
                  </span>
                  <h2 className="font-display text-lg font-extrabold text-foreground">{L.s3_title}</h2>
                </div>
                <p className="mt-3 text-sm text-muted-fg">{L.s3_text}</p>
                <Link
                  to="/uk-offices"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition-colors hover:text-brand"
                >
                  <Building2 className="h-3.5 w-3.5" /> {L.offices_cta}
                </Link>
              </div>
            </StaggerItem>
          </Stagger>

          {/* The luggage tag — mandatory details, styled as the thing itself */}
          <motion.div {...reveal} className="lg:sticky lg:top-24">
            <div className="relative mx-auto max-w-md rotate-[-1.2deg] rounded-2xl border-2 border-dashed border-brand/50 bg-card p-6 shadow-lift sm:p-7">
              {/* punch hole */}
              <span className="absolute left-1/2 top-3 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-border bg-background" />
              <p className="mt-2 text-center font-display text-sm font-extrabold uppercase tracking-widest text-brand-700">
                <PenLine className="mr-1.5 inline h-4 w-4 -translate-y-px" />
                {L.tag_head}
              </p>
              <div className="mt-5 space-y-4">
                {[
                  { label: L.tag_1_label, value: L.tag_1_value },
                  { label: L.tag_2_label, value: L.tag_2_value },
                  { label: L.tag_3_label, value: L.tag_3_value },
                ].map((r, i) => (
                  <div key={r.label} className="border-b border-dashed border-border pb-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
                      {i + 1}. {r.label}
                    </p>
                    <p className="mt-1 font-display text-base font-extrabold text-foreground">{r.value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-800 dark:bg-amber-400/10 dark:text-amber-300">
                <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                {L.tag_warn}
              </p>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ── Schedule band: Tuesday → Friday ───────────────────────────── */}
      <section className="border-y border-border bg-muted/40">
        <div className="container py-12 md:py-14">
          <motion.div {...reveal} className="mx-auto max-w-3xl text-center">
            <h2 className="flex items-center justify-center gap-2 font-display text-2xl font-extrabold tracking-tight text-foreground">
              <CalendarDays className="h-6 w-6 text-brand" /> {L.sched_title}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-fg">{L.sched_text}</p>
            <div className="mx-auto mt-8 flex max-w-xl items-center gap-4 sm:gap-6">
              <div className="shrink-0 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 font-display text-xs font-extrabold text-brand-700">
                  {L.tue.slice(0, 2).toUpperCase()}
                </div>
                <p className="mt-1.5 text-sm font-bold text-foreground">{L.tue}</p>
                <p className="text-xs text-muted-fg">{L.tue_note}</p>
              </div>
              <div className="relative h-7 min-w-0 flex-1">
                <div className="absolute top-1/2 w-full -translate-y-1/2 border-t-2 border-dashed border-border" />
                <motion.div
                  className="absolute left-0 top-1/2 -translate-y-1/2 border-t-2 border-brand"
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
              <div className="shrink-0 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 font-display text-xs font-extrabold text-brand-700">
                  {L.fri.slice(0, 2).toUpperCase()}
                </div>
                <p className="mt-1.5 text-sm font-bold text-foreground">{L.fri}</p>
                <p className="text-xs text-muted-fg">{L.fri_note}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Help CTA ──────────────────────────────────────────────────── */}
      <Section className="!py-14">
        <motion.div
          {...reveal}
          className="flex flex-col items-center gap-4 rounded-3xl border border-brand/20 bg-brand-50 p-8 text-center shadow-soft dark:border-brand/40 dark:bg-brand-50/20 md:p-10"
        >
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-foreground">{L.help_title}</h2>
          <p className="max-w-md text-muted-fg">{L.help_text}</p>
          <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" className="block sm:w-auto">
              <Button size="lg" className="w-full gap-2 bg-[#25D366] text-white hover:bg-[#1faa55] sm:w-auto">
                <WhatsAppIcon className="h-4 w-4" /> WhatsApp
              </Button>
            </a>
            <a href={`tel:${BG_DROPOFF.phone.replace(/\s/g, '')}`} className="block sm:w-auto">
              <Button size="lg" variant="outline" className="w-full gap-2 sm:w-auto">
                <Phone className="h-4 w-4" /> {BG_DROPOFF.phone}
              </Button>
            </a>
            <Link to="/contact" className="block sm:w-auto">
              <Button size="lg" variant="outline" className="w-full gap-2 sm:w-auto">
                <Send className="h-4 w-4" /> {lang === 'bg' ? 'Контакти' : 'Contact'}
              </Button>
            </Link>
          </div>
        </motion.div>
      </Section>
    </>
  );
}
