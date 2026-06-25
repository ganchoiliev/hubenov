import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Compass, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui';

export function NotFoundPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const L =
    locale === 'bg'
      ? {
          title: 'Страницата я няма',
          text: 'Изглежда тази пратка се е изгубила по пътя. Да те върнем към началото?',
        }
      : {
          title: 'Page not found',
          text: 'Looks like this parcel got lost in transit. Let us get you back home.',
        };

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand/10 blur-3xl" />
        <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="container flex min-h-[70vh] flex-col items-center justify-center py-16 text-center md:py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 shadow-soft"
        >
          <Compass className="h-8 w-8" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut', delay: 0.05 }}
          className="mt-6 font-display text-7xl font-extrabold tracking-tight text-foreground md:text-8xl"
        >
          404
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut', delay: 0.1 }}
        >
          <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-foreground">
            {L.title}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted-fg">{L.text}</p>

          <div className="mt-8 flex justify-center">
            <Link to="/">
              <Button size="lg" className="gap-2">
                <ArrowLeft className="h-4 w-4" /> {t('nav.home')}
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
