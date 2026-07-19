import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
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
  title: 'Не превозваме просто пратки. Превозваме доверие.',
  lead: 'Понякога една пратка е много повече от кашон. В нея има подарък за дете, домашно приготвени неща за близките, важни документи или просто частица от дома, която трябва да стигне навреме.',
  story_title: 'Защо го правим',
  story_p1:
    'Именно това ни вдъхнови да създадем Доставки Хубенов — услуга, изградена върху доверие, коректност и лично отношение към всеки клиент. За нас всяка пратка има своя история и своя получател, който я очаква.',
  story_p2:
    'Затова работим така, както бихме искали някой да се погрижи за нашите собствени вещи — внимателно, отговорно и с уважение. Вярваме, че качествената услуга не се измерва само с това колко бързо ще пристигне една пратка, а с увереността, че тя е в сигурни ръце през целия път.',
  story_p3:
    'Всеки ден се стремим да оправдаваме доверието, което клиентите ни гласуват. То е причината да се развиваме и да ставаме все по-добри. Защото за нас това не са просто пратки — превозваме доверие.',
  shop_eyebrow: 'Заповядайте при нас',
  shop_name: 'Доставки Хубенов',
  shop_sub: '4 офиса за приемане на пратки',
  shop_address_label: 'Главен склад',
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
  title: 'We don’t just carry parcels. We carry trust.',
  lead: 'Sometimes a parcel is far more than a box. Inside it is a present for a child, homemade food for loved ones, important documents — or simply a piece of home that has to arrive on time.',
  story_title: 'Why we do it',
  story_p1:
    'That is exactly what inspired us to create Hubenov Deliveries — a service built on trust, fairness and a personal relationship with every client. To us, every parcel has its own story and its own recipient waiting for it.',
  story_p2:
    'So we work the way we would want someone to care for our own belongings — carefully, responsibly and with respect. We believe good service is not measured only by how fast a parcel arrives, but by the confidence that it is in safe hands the whole way.',
  story_p3:
    'Every day we work to live up to the trust our clients place in us. That trust is the reason we keep growing and getting better. Because to us these are not just parcels — we carry trust.',
  shop_eyebrow: 'Come and see us',
  shop_name: 'Hubenov Deliveries',
  shop_sub: '4 parcel drop-off locations',
  shop_address_label: 'Main depot',
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
