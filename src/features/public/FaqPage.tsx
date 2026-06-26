import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, m as motion } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { Section, PageHeading } from '@/components/shared/common';
import { cn } from '@/lib/utils';

interface QA {
  q: string;
  a: string;
}

export function FaqPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';

  const extra: Record<'bg' | 'en', QA[]> = {
    bg: [
      {
        q: 'Как се определя крайната цена?',
        a: 'Онлайн офертата е ориентировъчна. Окончателната цена се потвърждава при приемане на пратката — измерваме реалното тегло и размери, защото те определят таксуваното тегло.',
      },
      {
        q: 'Какво не приемате за превоз?',
        a: 'Не приемаме течности под налягане, запалими и взривоопасни материали, наркотици, оръжия, нетрайни храни без опаковка, както и пратки, забранени от законите на Великобритания и България. При съмнение се свържете с нас преди да донесете колета.',
      },
      {
        q: 'Как работи наложеният платеж (COD)?',
        a: 'При доставка получателят плаща на куриера на Еконт. Сумата ви се превежда след успешна доставка. COD се уговаря предварително при приемане на пратката.',
      },
      {
        q: 'Как проследявам пратката си?',
        a: 'Всяка пратка има уникален номер. Въведете го в страница „Проследяване“ или влезте в профила си, за да видите статуса и историята на движение в реално време.',
      },
    ],
    en: [
      {
        q: 'How is the final price decided?',
        a: 'The online quote is an estimate. The final price is confirmed when we take in your parcel — we measure the actual weight and dimensions, as these determine the chargeable weight.',
      },
      {
        q: 'What items can’t you carry?',
        a: 'We don’t accept pressurised liquids, flammable or explosive materials, drugs, weapons, unpackaged perishable food, or anything prohibited by UK and Bulgarian law. If unsure, contact us before bringing the parcel in.',
      },
      {
        q: 'How does cash on delivery (COD) work?',
        a: 'On delivery the recipient pays the Econt courier. The amount is transferred to you after a successful delivery. COD is arranged in advance when we take in the parcel.',
      },
      {
        q: 'How do I track my parcel?',
        a: 'Every parcel has a unique number. Enter it on the “Track” page, or sign in to your account to see the live status and movement history.',
      },
    ],
  };

  const items: QA[] = [
    { q: t('faq.q1'), a: t('faq.a1') },
    { q: t('faq.q2'), a: t('faq.a2') },
    { q: t('faq.q3'), a: t('faq.a3') },
    { q: t('faq.q4'), a: t('faq.a4') },
    ...extra[locale],
  ];

  const [open, setOpen] = useState<number | null>(0);

  return (
    <Section>
      <div className="mx-auto max-w-3xl">
        <PageHeading title={t('faq.title')} />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="space-y-3"
        >
          {items.map((item, i) => {
            const isOpen = open === i;
            const panelId = `faq-panel-${i}`;
            const buttonId = `faq-button-${i}`;
            return (
              <div
                key={`${i}-${item.q}`}
                className={cn(
                  'overflow-hidden rounded-2xl border bg-card shadow-soft transition-colors',
                  isOpen ? 'border-brand/30' : 'border-border',
                )}
              >
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors',
                        isOpen ? 'bg-brand text-brand-fg' : 'bg-brand-50 text-brand-700',
                      )}
                    >
                      <HelpCircle className="h-4.5 w-4.5" />
                    </span>
                    <span className="flex-1 font-display text-base font-bold text-foreground">
                      {item.q}
                    </span>
                    <motion.span
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="shrink-0 text-muted-fg"
                    >
                      <ChevronDown className="h-5 w-5" />
                    </motion.span>
                  </button>
                </h3>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                    >
                      <p className="px-5 pb-5 pl-[4.5rem] text-sm leading-relaxed text-muted-fg">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </motion.div>
      </div>
    </Section>
  );
}
