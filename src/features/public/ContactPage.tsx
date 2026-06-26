import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Phone, Send, PackageCheck, Store, MessageCircle, Mail } from 'lucide-react';
import { Button, Card, CardBody, Input, Textarea, Field } from '@/components/ui';
import { Section, PageHeading } from '@/components/shared/common';
import { Stagger, StaggerItem } from '@/components/motion';
import { useToast } from '@/components/ui/toast';
import { company } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { whatsappUrl, viberUrl, telUrl, mailtoUrl } from '@/lib/contact';
import { WhatsAppIcon } from '@/components/brand/ContactIcons';

interface ContactForm {
  name: string;
  phone: string;
  email: string;
  message: string;
}

const EMPTY: ContactForm = { name: '', phone: '', email: '', message: '' };

export function ContactPage() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const locale = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';

  const L =
    locale === 'bg'
      ? {
          dropoff: 'Приемаме колети в магазина — Mini Market Bulgaria / Българска пекарна Хубенови.',
          form_title: 'Изпратете запитване',
          form_hint: 'Попълнете формата и ще се свържем с вас.',
          name: 'Име',
          name_ph: 'Вашето име',
          phone: 'Телефон',
          phone_ph: '+44 7895 909915',
          message: 'Съобщение',
          message_ph: 'Как можем да помогнем?',
          submit: 'Изпрати',
          thanks: 'Благодарим! Ще се свържем с вас скоро.',
          reach_title: 'Пишете ни директно',
          call_btn: 'Обади се',
          email_label: 'Имейл (по избор)',
          email_ph: 'вашият@имейл.bg',
        }
      : {
          dropoff: 'Drop your parcels at the shop — Mini Market Bulgaria / Hubenovi Bulgarian Bakery.',
          form_title: 'Send an enquiry',
          form_hint: 'Fill in the form and we will get back to you.',
          name: 'Name',
          name_ph: 'Your name',
          phone: 'Phone',
          phone_ph: '+44 7895 909915',
          message: 'Message',
          message_ph: 'How can we help?',
          submit: 'Send',
          thanks: 'Thank you! We will be in touch soon.',
          reach_title: 'Message us directly',
          call_btn: 'Call',
          email_label: 'Email (optional)',
          email_ph: 'your@email.com',
        };

  const [form, setForm] = useState<ContactForm>(EMPTY);
  const [hp, setHp] = useState(''); // honeypot — bots fill it, humans never see it
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof ContactForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('contact', {
        body: {
          name: form.name,
          phone: form.phone,
          email: form.email || undefined,
          message: form.message,
          website: hp,
        },
      });
      if (error || (data as { ok?: boolean } | null)?.ok === false) {
        throw error ?? new Error('contact_failed');
      }
      toast.success(L.thanks);
      setForm(EMPTY);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const phoneHref = `tel:${company.phone.replace(/\s/g, '')}`;

  return (
    <Section className="!py-12 md:!py-16">
      <PageHeading title={t('contact.title')} subtitle={t('contact.subtitle')} />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Left — details */}
        <Stagger className="space-y-5">
          <StaggerItem>
            <Card>
              <CardBody className="space-y-3">
                <h2 className="font-display text-lg font-extrabold text-foreground">{L.reach_title}</h2>
                <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" className="block">
                  <Button className="w-full gap-2 bg-[#25D366] text-white hover:bg-[#1faa55]">
                    <WhatsAppIcon className="h-4 w-4" /> WhatsApp
                  </Button>
                </a>
                <div className="grid grid-cols-2 gap-2">
                  <a href={viberUrl()} className="block">
                    <Button variant="outline" className="w-full gap-2">
                      <MessageCircle className="h-4 w-4" /> Viber
                    </Button>
                  </a>
                  <a href={telUrl()} className="block">
                    <Button variant="outline" className="w-full gap-2">
                      <Phone className="h-4 w-4" /> {L.call_btn}
                    </Button>
                  </a>
                </div>
                <a
                  href={mailtoUrl('Запитване')}
                  className="inline-flex items-center gap-2 text-sm text-brand-700 hover:underline"
                >
                  <Mail className="h-4 w-4" /> {company.email}
                </a>
              </CardBody>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card>
              <CardBody>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <MapPin className="h-5 w-5" />
                </div>
                <h2 className="mt-4 font-display text-lg font-extrabold text-foreground">
                  {t('contact.visit')}
                </h2>
                <p className="mt-1.5 text-sm text-foreground">{company.address}</p>
                <p className="mt-3 flex items-start gap-2 text-sm text-muted-fg">
                  <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  {L.dropoff}
                </p>
              </CardBody>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card>
              <CardBody>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
                  <Phone className="h-5 w-5" />
                </div>
                <h2 className="mt-4 font-display text-lg font-extrabold text-foreground">
                  {t('contact.call')}
                </h2>
                <a
                  href={phoneHref}
                  className="mt-1.5 inline-flex items-center gap-2 font-display text-xl font-extrabold text-brand-700 transition-colors hover:text-brand"
                >
                  <Phone className="h-4 w-4" />
                  {company.phone}
                </a>
              </CardBody>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 px-5 py-4 text-sm text-muted-fg">
              <Store className="h-5 w-5 shrink-0 text-brand" />
              <span>Mini Market Bulgaria · Българска пекарна Хубенови</span>
            </div>
          </StaggerItem>
        </Stagger>

        {/* Right — non-submitting form */}
        <Card>
          <CardBody>
            <h2 className="font-display text-lg font-extrabold text-foreground">{L.form_title}</h2>
            <p className="mt-1 text-sm text-muted-fg">{L.form_hint}</p>

            <form onSubmit={onSubmit} className="mt-5 space-y-4">
              {/* honeypot — hidden from humans, trips bots */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={hp}
                onChange={(e) => setHp(e.target.value)}
                className="hidden"
                aria-hidden="true"
              />
              <Field label={L.name} htmlFor="contact-name">
                <Input
                  id="contact-name"
                  value={form.name}
                  onChange={set('name')}
                  placeholder={L.name_ph}
                  autoComplete="name"
                  required
                />
              </Field>

              <Field label={L.phone} htmlFor="contact-phone">
                <Input
                  id="contact-phone"
                  type="tel"
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder={L.phone_ph}
                  autoComplete="tel"
                  required
                />
              </Field>

              <Field label={L.email_label} htmlFor="contact-email">
                <Input
                  id="contact-email"
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder={L.email_ph}
                  autoComplete="email"
                />
              </Field>

              <Field label={L.message} htmlFor="contact-message">
                <Textarea
                  id="contact-message"
                  value={form.message}
                  onChange={set('message')}
                  placeholder={L.message_ph}
                  required
                />
              </Field>

              <Button type="submit" loading={submitting} className="w-full gap-2">
                <Send className="h-4 w-4" /> {L.submit}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </Section>
  );
}
