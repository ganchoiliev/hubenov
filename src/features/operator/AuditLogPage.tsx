import { useTranslation } from 'react-i18next';
import { History, Package, Receipt, User, Truck, RefreshCw } from 'lucide-react';
import { Card, Badge, Spinner } from '@/components/ui';
import { PageHeading, EmptyState } from '@/components/shared/common';
import { useAuditLog } from '@/lib/queries';
import { formatDate } from '@/lib/utils';

const ENTITY = {
  shipments: { icon: Package, bg: 'Пратка', en: 'Parcel' },
  invoices: { icon: Receipt, bg: 'Фактура', en: 'Invoice' },
  profiles: { icon: User, bg: 'Клиент', en: 'Client' },
  loads: { icon: Truck, bg: 'Курс', en: 'Load' },
} as const;

export function AuditLogPage() {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const locale = lang === 'en' ? 'en-GB' : 'bg-BG';
  const { data, isLoading, isFetching, refetch } = useAuditLog();

  const L =
    lang === 'bg'
      ? {
          title: 'Дневник на дейността',
          subtitle: 'Кой какво е променил или изтрил',
          empty: 'Няма записи още',
          refresh: 'Обнови',
          by: 'от',
          actions: { delete: 'Изтриване', create: 'Създаване', update: 'Промяна' } as Record<string, string>,
        }
      : {
          title: 'Activity log',
          subtitle: 'Who changed or deleted what',
          empty: 'No entries yet',
          refresh: 'Refresh',
          by: 'by',
          actions: { delete: 'Deleted', create: 'Created', update: 'Updated' } as Record<string, string>,
        };

  const entityLabel = (e: string) => ENTITY[e as keyof typeof ENTITY]?.[lang] ?? e;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <PageHeading title={L.title} subtitle={L.subtitle} />
        <button
          onClick={() => void refetch()}
          className="rounded-lg p-2 text-muted-fg transition-colors hover:bg-muted hover:text-foreground"
          aria-label={L.refresh}
          title={L.refresh}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-7 w-7" />
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState title={L.empty} icon={<History className="h-7 w-7" />} />
      ) : (
        <Card>
          <div className="divide-y divide-border">
            {data.map((r) => {
              const Icon = ENTITY[r.entity as keyof typeof ENTITY]?.icon ?? History;
              const tone = r.action === 'delete' ? 'danger' : r.action === 'create' ? 'success' : 'info';
              return (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-fg">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge tone={tone}>{L.actions[r.action] ?? r.action}</Badge>
                      <span className="font-medium text-foreground">{entityLabel(r.entity)}</span>
                      {r.summary && <span className="font-mono text-xs text-muted-fg">{r.summary}</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-fg">
                      {r.actor_name ? `${L.by} ${r.actor_name} · ` : ''}
                      {formatDate(r.at, locale, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
