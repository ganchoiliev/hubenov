import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, Search, ArrowRight, Package, PackagePlus, Trash2 } from 'lucide-react';
import { Card, CardBody, Input, Badge, Button, Spinner } from '@/components/ui';
import { useConfirm } from '@/components/ui/confirm';
import { useToast } from '@/components/ui/toast';
import { PageHeading, EmptyState } from '@/components/shared/common';
import { Stagger, StaggerItem } from '@/components/motion';
import { useClients, useDeleteClient } from '@/lib/queries';
import { transliterate } from '@/lib/translit';

export function ClientsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const locale = lang === 'en' ? 'en-GB' : 'bg-BG';
  const { data, isLoading } = useClients();
  const [q, setQ] = useState('');
  const confirm = useConfirm();
  const toast = useToast();
  const del = useDeleteClient();

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
          delTitle: 'Изтриване на клиент',
          delBody: 'Клиентът и съобщенията му ще бъдат изтрити безвъзвратно. Клиент с пратки или фактури не може да бъде изтрит.',
          delConfirm: 'Изтрий',
          cancel: 'Отказ',
          deleted: 'Клиентът е изтрит',
          linked: 'Клиентът има пратки или фактури — изтрийте ги първо.',
          delErr: 'Неуспешно изтриване',
          del: 'Изтрий клиент',
        }
      : {
          subtitle: 'Every client and their parcels',
          search: 'Search by name, OT number, phone…',
          parcels: 'parcels',
          empty: 'No clients yet',
          emptySearch: 'No matches',
          newShipment: 'New shipment',
          joined: 'Joined',
          delTitle: 'Delete client',
          delBody: 'The client and their messages will be permanently deleted. A client with parcels or invoices cannot be deleted.',
          delConfirm: 'Delete',
          cancel: 'Cancel',
          deleted: 'Client deleted',
          linked: 'Client has parcels or invoices — remove those first.',
          delErr: 'Could not delete',
          del: 'Delete client',
        };

  const onDelete = async (e: React.MouseEvent, c: { id: string; full_name: string; client_code: string }) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = await confirm({ title: L.delTitle, body: L.delBody, confirmLabel: L.delConfirm, cancelLabel: L.cancel, danger: true });
    if (!ok) return;
    try {
      await del.mutateAsync(c.id);
      toast.success(L.deleted);
    } catch (err) {
      toast.error((err as Error).message === 'linked_records' ? L.linked : L.delErr);
    }
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
                    <div className="flex shrink-0 items-center gap-3 text-sm text-muted-fg">
                      <span className="inline-flex items-center gap-1.5 tabular-nums">
                        <Package className="h-4 w-4" /> {c.shipment_count} {L.parcels}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => onDelete(e, c)}
                        title={L.del}
                        aria-label={L.del}
                        className="rounded-lg p-1.5 text-muted-fg transition-colors hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
