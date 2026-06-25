import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, Search, ArrowRight, Package, PackagePlus } from 'lucide-react';
import { Card, CardBody, Input, Badge, Button, Spinner } from '@/components/ui';
import { PageHeading, EmptyState } from '@/components/shared/common';
import { Stagger, StaggerItem } from '@/components/motion';
import { useClients } from '@/lib/queries';
import { transliterate } from '@/lib/translit';

export function ClientsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const locale = lang === 'en' ? 'en-GB' : 'bg-BG';
  const { data, isLoading } = useClients();
  const [q, setQ] = useState('');

  const L =
    lang === 'bg'
      ? {
          subtitle: 'Всички клиенти и техните пратки',
          search: 'Търси по име, ОТ номер, телефон…',
          parcels: 'пратки',
          empty: 'Няма клиенти още',
          emptySearch: 'Няма съвпадения',
          newShipment: 'Нова пратка',
          joined: 'Регистриран',
        }
      : {
          subtitle: 'Every client and their parcels',
          search: 'Search by name, OT number, phone…',
          parcels: 'parcels',
          empty: 'No clients yet',
          emptySearch: 'No matches',
          newShipment: 'New shipment',
          joined: 'Joined',
        };

  const filtered = useMemo(() => {
    const list = data ?? [];
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter((c) =>
      [c.full_name, transliterate(c.full_name), c.client_code, c.phone ?? '', c.email ?? '']
        .some((h) => h.toLowerCase().includes(s)),
    );
  }, [data, q]);

  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeading title={t('operator.customers')} subtitle={L.subtitle} />
        <Link to="/op/intake">
          <Button className="gap-2">
            <PackagePlus className="h-4 w-4" /> {L.newShipment}
          </Button>
        </Link>
      </div>

      <div className="relative mb-5 mt-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L.search} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-7 w-7" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title={data && data.length > 0 ? L.emptySearch : L.empty} icon={<Users className="h-7 w-7" />} />
      ) : (
        <Stagger className="space-y-2">
          {filtered.map((c) => (
            <StaggerItem key={c.id}>
              <Link to={`/op/lookup?code=${encodeURIComponent(c.client_code)}`} className="block">
                <Card className="transition-shadow hover:shadow-lift">
                  <CardBody className="flex items-center justify-between gap-4 py-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{c.full_name || '—'}</p>
                        <Badge tone="brand">{c.client_code}</Badge>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-fg">
                        {[c.phone, c.email].filter(Boolean).join(' · ') || `${L.joined} ${fmtDate(c.created_at)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-4 text-sm text-muted-fg">
                      <span className="inline-flex items-center gap-1.5 tabular-nums">
                        <Package className="h-4 w-4" /> {c.shipment_count} {L.parcels}
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardBody>
                </Card>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
