import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Store,
  Truck,
  HeartHandshake,
  ShieldCheck,
  Users,
  MapPin,
  Phone,
  CalendarClock,
  ArrowRight,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { Stagger, StaggerItem } from '@/components/motion';
import { Section, ImageHero } from '@/components/shared/common';
import { company } from '@/lib/env';

interface ValueCopy {
  title: string;
  text: string;
}
interface AboutCopy {
  badge: string;
  title: string;
  lead: string;
  story_title: string;
  story_p1: string;
  story_p2: string;
  story_p3: string;
  shop_eyebrow: string;
  shop_name: string;
  shop_sub: string;
  shop_address_label: string;
  shop_phone_label: string;
  shop_friday: string;
  values_title: string;
  values_subtitle: string;
  values: ValueCopy[];
  cta_title: string;
  cta_text: string;
  cta_quote: string;
  cta_track: string;
}

const BG: AboutCopy = {
  badge: 'Манчестър · Eccles',
  title: 'Семейна работа, а не просто превоз',
  lead: 'Доставки Хубенов е семейна фирма, родена зад тезгяха на нашия магазин в Манчестър. Свързваме българите във Великобритания с близките им у дома — с грижа, с лице и с име зад всеки колет.',
  story_title: 'Нашата история',
  story_p1:
    'Всичко започна от магазина — Mini Market Bulgaria, Българската пекарна Хубенови на 542 Liverpool Road в Eccles. Тук сънародниците ни идват за родния вкус: пресен хляб, баница, сирене и хилядите малки неща, които миришат на вкъщи.',
  story_p2:
    'А след пазара винаги идваше един и същ въпрос: „Ще можете ли да пратите това на мама в България?“ Така, колет по колет, се роди и превозът. Днес имаме собствен транспорт и тръгваме с бус всеки петък — без посредници, без презастраховане при чужди подизпълнители.',
  story_p3:
    'За нас всяка пратка е лична. Зад нея стои рожден ден, който не искате да пропуснете, лекарство, което трябва да стигне навреме, или просто буркан мед от баба. Затова я пазим така, както бихте го направили вие.',
  shop_eyebrow: 'Заповядайте при нас',
  shop_name: 'Mini Market Bulgaria',
  shop_sub: 'Българска пекарна Хубенови',
  shop_address_label: 'Адрес за приемане',
  shop_phone_label: 'Телефон',
  shop_friday: 'Бус за България — всеки петък',
  values_title: 'В какво вярваме',
  values_subtitle: 'Малки неща, които правят голямата разлика, когато пращате към най-близките си.',
  values: [
    {
      title: 'Собствен транспорт',
      text: 'Ние возим до България. Колетът ви е в наши ръце по целия път — без чужди подизпълнители.',
    },
    {
      title: 'Курс всеки петък',
      text: 'Редовен график, на който можете да разчитате. Знаете точно кога тръгва пратката ви.',
    },
    {
      title: 'Семейна грижа',
      text: 'Третираме подаръците и личните пратки така, както бихме третирали своите собствени.',
    },
    {
      title: 'Лице и име',
      text: 'Истински хора зад тезгяха. Винаги имате на кого да се обадите и кой да ви познае.',
    },
  ],
  cta_title: 'Готови ли сте да изпратите?',
  cta_text: 'Изчислете цена за секунди или проследете пратка, която вече пътува към България.',
  cta_quote: 'Изчисли цена',
  cta_track: 'Проследи пратка',
};

const EN: AboutCopy = {
  badge: 'Manchester · Eccles',
  title: 'A family business, not just a courier',
  lead: 'Hubenov Deliveries is a family business born behind the counter of our shop in Manchester. We connect Bulgarians in the UK with the people they love back home — with care, and a real face and name behind every parcel.',
  story_title: 'Our story',
  story_p1:
    'It all started in the shop — Mini Market Bulgaria, the Hubenovi Bulgarian bakery at 542 Liverpool Road in Eccles. This is where our community comes for the taste of home: fresh bread, banitsa, cheese and the thousand small things that smell like home.',
  story_p2:
    'And after the shopping there was always the same question: "Could you send this to my mum in Bulgaria?" Parcel by parcel, the transport was born. Today we run our own transport and a van leaves every Friday — no middlemen, no reselling the job to outside subcontractors.',
  story_p3:
    'To us, every parcel is personal. Behind it is a birthday you do not want to miss, medicine that has to arrive on time, or simply a jar of grandma’s honey. So we look after it the way you would yourself.',
  shop_eyebrow: 'Come and see us',
  shop_name: 'Mini Market Bulgaria',
  shop_sub: 'Hubenovi Bulgarian Bakery',
  shop_address_label: 'Drop-off address',
  shop_phone_label: 'Phone',
  shop_friday: 'Van to Bulgaria — every Friday',
  values_title: 'What we believe',
  values_subtitle: 'The small things that make the big difference when you send to the people closest to you.',
  values: [
    {
      title: 'Our own transport',
      text: 'We drive to Bulgaria. Your parcel stays in our hands the whole way — no outside subcontractors.',
    },
    {
      title: 'A van every Friday',
      text: 'A regular schedule you can rely on. You always know exactly when your parcel leaves.',
    },
    {
      title: 'Family care',
      text: 'We treat gifts and personal parcels exactly as we would treat our own.',
    },
    {
      title: 'A face and a name',
      text: 'Real people behind the counter. Always someone to call and someone who knows you.',
    },
  ],
  cta_title: 'Ready to send something home?',
  cta_text: 'Get a price in seconds, or track a parcel already on its way to Bulgaria.',
  cta_quote: 'Get a price',
  cta_track: 'Track a parcel',
};

const VALUE_ICONS = [Truck, CalendarClock, HeartHandshake, Users] as const;

export function AboutPage() {
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const L = locale === 'bg' ? BG : EN;
  const tel = company.phone.replace(/\s/g, '');

  return (
    <>
      <ImageHero
        image="/images/received.webp"
        eyebrow={
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
            <Store className="h-3.5 w-3.5" /> {L.badge}
          </span>
        }
        title={L.title}
        subtitle={L.lead}
      />

      {/* Story + shop card */}
      <Section className="!py-12">
        <div className="grid items-start gap-10 lg:grid-cols-5">
          {/* Narrative */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.35 }}
            className="lg:col-span-3"
          >
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
              {L.story_title}
            </h2>
            <div className="mt-5 space-y-4 text-base leading-relaxed text-muted-fg">
              <p>{L.story_p1}</p>
              <p>{L.story_p2}</p>
              <p>{L.story_p3}</p>
            </div>
          </motion.div>

          {/* Shop card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="lg:col-span-2"
          >
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
              <img
                src="/images/van-loading.webp"
                alt={locale === 'bg' ? 'Товарене на буса с колети' : 'Loading parcels into the van'}
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="space-y-4 p-6">
                <div>
                  <p className="font-display text-lg font-bold text-foreground">{L.shop_name}</p>
                  <p className="text-sm text-muted-fg">{L.shop_sub}</p>
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                  {L.shop_eyebrow}
                </p>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-fg">
                      {L.shop_address_label}
                    </p>
                    <p className="text-sm text-foreground">{company.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-fg">
                      {L.shop_phone_label}
                    </p>
                    <a href={`tel:${tel}`} className="text-sm text-foreground hover:text-brand">
                      {company.phone}
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-brand-50 px-3.5 py-2.5 text-sm font-semibold text-brand-700">
                  <Truck className="h-4 w-4" /> {L.shop_friday}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* Values */}
      <section className="border-y border-border bg-muted/40">
        <div className="container py-16 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-brand-fg shadow-soft">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-foreground">
              {L.values_title}
            </h2>
            <p className="mt-3 text-muted-fg">{L.values_subtitle}</p>
          </div>

          <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {L.values.map((v, i) => {
              const Icon = VALUE_ICONS[i] ?? HeartHandshake;
              return (
                <StaggerItem key={v.title}>
                  <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-soft transition-shadow hover:shadow-lift">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 font-display text-base font-bold text-foreground">{v.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-fg">{v.text}</p>
                  </div>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>

      {/* Our operation — real photos */}
      <section className="border-t border-border bg-muted/40">
        <div className="container py-16 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
              {locale === 'bg' ? 'Нашата работа' : 'Our operation'}
            </h2>
            <p className="mt-3 text-muted-fg">
              {locale === 'bg'
                ? 'Истински курсове, истински обем — всеки петък от Манчестър за България.'
                : 'Real runs, real volume — every Friday from Manchester to Bulgaria.'}
            </p>
          </div>
          <Stagger className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { src: '/images/storefront.webp', alt: locale === 'bg' ? 'Товарене в Манчестър' : 'Loading in Manchester' },
              { src: '/images/hub-interior.webp', alt: locale === 'bg' ? 'Нашата складова база' : 'Our hub' },
              { src: '/images/pallets.webp', alt: locale === 'bg' ? 'Палети, готови за България' : 'Pallets ready for Bulgaria' },
            ].map((p) => (
              <StaggerItem key={p.src}>
                <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-border shadow-soft">
                  <img
                    src={p.src}
                    alt={p.alt}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* CTA */}
      <Section>
        <div className="grid items-center gap-8 rounded-3xl border border-border bg-card p-8 shadow-soft md:grid-cols-2 md:p-12">
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
              {L.cta_title}
            </h2>
            <p className="mt-3 text-muted-fg">{L.cta_text}</p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link to="/quote">
              <Button size="lg" className="gap-2">
                {L.cta_quote} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/track">
              <Button size="lg" variant="outline" className="gap-2">
                <Search className="h-4 w-4" /> {L.cta_track}
              </Button>
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
