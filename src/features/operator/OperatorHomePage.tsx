import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ScanLine, UserSearch, PackagePlus, Truck, ArrowRight } from 'lucide-react';
import { Card, CardBody } from '@/components/ui';
import { Stat, PageHeading } from '@/components/shared/common';
import { Stagger, StaggerItem } from '@/components/motion';
import { DepartureCountdown } from '@/components/shared/DepartureCountdown';
import { useLoads } from '@/lib/queries';
import { useAuth } from '@/lib/auth';

const ACTIONS = [
  { to: '/op/scan', icon: ScanLine, key: 'operator.scan_title' },
  { to: '/op/lookup', icon: UserSearch, key: 'operator.lookup_title' },
  { to: '/op/intake', icon: PackagePlus, key: 'operator.intake_title' },
  { to: '/op/loads', icon: Truck, key: 'operator.loads' },
];

const ROLE_BG: Record<string, string> = {
  owner: 'Собственик',
  operator: 'Оператор',
  driver: 'Шофьор',
  client: 'Клиент',
};

export function OperatorHomePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const { profile } = useAuth();
  const loads = useLoads();

  const totalLoads = loads.data?.length ?? 0;
  const openLoads = loads.data?.filter((l) => l.status === 'open').length ?? 0;
  const inTransit = loads.data?.filter((l) => l.status === 'departed').length ?? 0;

  const roleLabel = profile?.role ? (lang === 'bg' ? (ROLE_BG[profile.role] ?? profile.role) : profile.role) : '';

  return (
    <div>
      <PageHeading
        title={t('operator.console')}
        subtitle={profile?.full_name ? `${profile.full_name} · ${roleLabel}` : undefined}
      />

      {/* Quick actions */}
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ACTIONS.map((a) => (
          <StaggerItem key={a.to}>
            <Link to={a.to}>
              <Card className="group h-full transition-shadow hover:shadow-lift">
                <CardBody className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <a.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{t(a.key)}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-fg transition-transform group-hover:translate-x-1" />
                </CardBody>
              </Card>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>

      {/* Next departure + load stats */}
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DepartureCountdown />
        </div>
        <div className="grid gap-4">
          <Stat
            label={lang === 'bg' ? 'Курсове' : 'Loads'}
            value={totalLoads}
            hint={`${openLoads} ${lang === 'bg' ? 'отворени' : 'open'}`}
          />
          <Stat
            label={lang === 'bg' ? 'В транзит' : 'In transit'}
            value={inTransit}
            hint={lang === 'bg' ? 'към България' : 'to Bulgaria'}
          />
        </div>
      </div>
    </div>
  );
}
