/**
 * Econt office picker — searchable list of BG offices for the receiver. Searches
 * via the CourierProvider (mock now, live Econt later), which matches in both
 * Cyrillic and Latin (e.g. "Silistra" finds "Силистра"). Shared by the client
 * New-Shipment wizard and the operator intake form.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, MapPin } from 'lucide-react';
import { Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import { getCourier, type EcontOffice } from '@/providers/courier';

export function EcontOfficePicker({
  onPick,
  selected,
}: {
  onPick: (o: EcontOffice) => void;
  selected: string | null;
}) {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<EcontOffice[]>([]);

  useEffect(() => {
    let active = true;
    void getCourier()
      .getOffices(q)
      .then((r) => {
        if (active) setResults(r);
      });
    return () => {
      active = false;
    };
  }, [q]);

  return (
    <div className="rounded-xl border border-border p-4">
      <p className="mb-2 text-sm font-medium">{t('wizard.office_picker')}</p>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('wizard.office_search')} className="pl-9" />
      </div>
      <div className="mt-3 max-h-44 space-y-1.5 overflow-y-auto">
        {results.map((o) => (
          <button
            key={o.code}
            type="button"
            onClick={() => onPick(o)}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
              selected === o.code ? 'bg-brand text-brand-fg' : 'hover:bg-muted',
            )}
          >
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="flex-1">
              {o.city} — {o.name}
            </span>
            <span className="font-mono text-xs opacity-70">{o.code}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
