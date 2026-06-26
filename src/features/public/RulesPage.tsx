import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { m as motion } from 'framer-motion';
import { Check, Ban, AlertTriangle, Package, FileText, ShieldCheck, ArrowRight } from 'lucide-react';
import { Section, PageHeading } from '@/components/shared/common';
import { Card, CardBody } from '@/components/ui';

const COPY = {
  bg: {
    title: 'Правила за пратки',
    subtitle: 'Какво приемаме, какво е забранено и как да опаковате — за бърза и безпроблемна доставка.',
    acceptedTitle: 'Приемаме',
    accepted: [
      'Дрехи, обувки, текстил',
      'Запечатани нетрайни храни',
      'Козметика (незапалима)',
      'Книги, играчки, домашни стоки',
      'Електроника (с обявена стойност)',
      'Документи и подаръци',
    ],
    prohibitedTitle: 'Забранени (не приемаме)',
    prohibited: [
      'Наркотици и психоактивни вещества',
      'Оръжия, боеприпаси, взривове, пиротехника',
      'Запалими и под налягане: газ, аерозоли, запалки, бои, разтворители',
      'Корозивни и токсични химикали',
      'Пари в брой, карти, чекове, бижута и благородни метали',
      'Живи животни и растения',
      'Нетрайни храни без подходяща опаковка / изискващи хладилник',
      'Фалшиви стоки и незаконни материали',
      'Всичко забранено от законите на Великобритания и България',
    ],
    restrictedTitle: 'С условия (декларирайте предварително)',
    restricted: [
      'Литиеви батерии — само монтирани в устройството; отделни батерии не се приемат',
      'Алкохол и тютюн — с ограничения и мита; декларирайте',
      'Течности — запечатани, незапалими, добре опаковани',
      'Лекарства — лични количества, в оригинална опаковка',
      'Ценни предмети — застраховайте/декларирайте; не препоръчваме незаменими вещи',
    ],
    packTitle: 'Опаковане',
    pack: 'Използвайте здрава кутия и пълнеж, запечатайте добре, премахнете стари етикети и надпишете ясно подател и получател. Чупливите вещи маркирайте и опаковайте допълнително.',
    customsTitle: 'Стойност и митница',
    customs: 'Декларирайте реалната стойност на съдържанието. Занижаването е нарушение и може да доведе до глоби или задържане от митница. За стоки прилагаме търговска фактура.',
    liabilityTitle: 'Отговорност',
    liability: 'Грижим се за всяка пратка. Претенции се разглеждат с доказателство за съдържание и стойност. Забранени или лошо опаковани пратки, както и недекларирани ценности, не подлежат на обезщетение.',
    note: 'Не сте сигурни за нещо? Свържете се с нас преди да донесете колета.',
    contact: 'Свържете се',
  },
  en: {
    title: 'Shipping rules',
    subtitle: 'What we accept, what’s prohibited, and how to pack — for fast, problem-free delivery.',
    acceptedTitle: 'We accept',
    accepted: [
      'Clothing, shoes, textiles',
      'Sealed non-perishable food',
      'Cosmetics (non-flammable)',
      'Books, toys, household goods',
      'Electronics (with declared value)',
      'Documents and gifts',
    ],
    prohibitedTitle: 'Prohibited (not accepted)',
    prohibited: [
      'Drugs and psychoactive substances',
      'Weapons, ammunition, explosives, fireworks',
      'Flammable / pressurised: gas, aerosols, lighters, paint, solvents',
      'Corrosive and toxic chemicals',
      'Cash, cards, cheques, jewellery and precious metals',
      'Live animals and plants',
      'Perishable food without proper packaging / needing refrigeration',
      'Counterfeit goods and illegal materials',
      'Anything prohibited by UK and Bulgarian law',
    ],
    restrictedTitle: 'Conditional (declare in advance)',
    restricted: [
      'Lithium batteries — only installed in the device; loose batteries not accepted',
      'Alcohol and tobacco — limits and duties apply; declare',
      'Liquids — sealed, non-flammable, well packed',
      'Medicines — personal quantities, in original packaging',
      'Valuables — insure/declare; we advise against irreplaceable items',
    ],
    packTitle: 'Packing',
    pack: 'Use a sturdy box with cushioning, seal it well, remove old labels, and clearly mark sender and receiver. Mark and extra-pad fragile items.',
    customsTitle: 'Value & customs',
    customs: 'Declare the true value of the contents. Under-declaring is an offence and can lead to fines or customs holds. We attach a commercial invoice for goods.',
    liabilityTitle: 'Liability',
    liability: 'We handle every parcel with care. Claims are assessed with proof of contents and value. Prohibited or poorly packed parcels, and undeclared valuables, are not eligible for compensation.',
    note: 'Unsure about something? Contact us before bringing the parcel in.',
    contact: 'Contact us',
  },
} as const;

export function RulesPage() {
  const { i18n } = useTranslation();
  const L = COPY[i18n.resolvedLanguage === 'en' ? 'en' : 'bg'];

  return (
    <Section>
      <div className="mx-auto max-w-4xl">
        <PageHeading title={L.title} subtitle={L.subtitle} />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="space-y-5"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Card className="border-success/30">
              <CardBody>
                <p className="mb-3 flex items-center gap-2 font-display font-bold text-foreground">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/15 text-success">
                    <Check className="h-4.5 w-4.5" />
                  </span>
                  {L.acceptedTitle}
                </p>
                <ul className="space-y-2 text-sm text-muted-fg">
                  {L.accepted.map((x) => (
                    <li key={x} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {x}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            <Card className="border-danger/30">
              <CardBody>
                <p className="mb-3 flex items-center gap-2 font-display font-bold text-foreground">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger/15 text-danger">
                    <Ban className="h-4.5 w-4.5" />
                  </span>
                  {L.prohibitedTitle}
                </p>
                <ul className="space-y-2 text-sm text-muted-fg">
                  {L.prohibited.map((x) => (
                    <li key={x} className="flex items-start gap-2">
                      <Ban className="mt-0.5 h-4 w-4 shrink-0 text-danger" /> {x}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>

          <Card className="border-warning/40">
            <CardBody>
              <p className="mb-3 flex items-center gap-2 font-display font-bold text-foreground">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/20 text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-4.5 w-4.5" />
                </span>
                {L.restrictedTitle}
              </p>
              <ul className="grid gap-2 text-sm text-muted-fg sm:grid-cols-2">
                {L.restricted.map((x) => (
                  <li key={x} className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" /> {x}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <div className="grid gap-5 md:grid-cols-3">
            {[
              { icon: Package, title: L.packTitle, body: L.pack },
              { icon: FileText, title: L.customsTitle, body: L.customs },
              { icon: ShieldCheck, title: L.liabilityTitle, body: L.liability },
            ].map((s) => (
              <Card key={s.title}>
                <CardBody>
                  <p className="mb-2 flex items-center gap-2 font-display font-bold text-foreground">
                    <s.icon className="h-4.5 w-4.5 text-brand-700" /> {s.title}
                  </p>
                  <p className="text-sm leading-relaxed text-muted-fg">{s.body}</p>
                </CardBody>
              </Card>
            ))}
          </div>

          <Card className="bg-brand-50/40">
            <CardBody className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">{L.note}</p>
              <Link
                to="/contact"
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-fg shadow-soft transition-colors hover:bg-brand-600"
              >
                {L.contact} <ArrowRight className="h-4 w-4" />
              </Link>
            </CardBody>
          </Card>
        </motion.div>
      </div>
    </Section>
  );
}
