/**
 * Econt office picker — searchable list of BG offices for the receiver. Searches
 * via the CourierProvider (mock now, live Econt later), which matches in both
 * Cyrillic and Latin (e.g. "Silistra" finds "Силистра"). Shared by the client
 * New-Shipment wizard and the operator intake form.
 *
 * UX: every row is explicitly badged as an Econt office, the selected row carries
 * a checkmark, and a confirmation card above the search makes the current choice
 * unmistakable to the operator (with an optional clear/change control).
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Building2, Check, CheckCircle2, X } from 'lucide-react';
import { Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import { getCourier, type EcontOffice } from '@/providers/courier';

export function EcontOfficePicker({
  onPick,
  selected,
  onClear,
}: {
  onPick: (o: EcontOffice) => void;
  selected: string | null;
  onClear?: () => void;
}) {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<EcontOffice[]>([]);
  const [picked, setPicked] = useState<EcontOffice | null>(null);

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

  // Forget the cached office object once the parent clears the selection.
  useEffect(() => {
    if (!selected) setPicked(null);
  }, [selected]);

  const selectedOffice =
    picked && picked.code === selected ? picked : (results.find((o) => o.code === selected) ?? null);

  function choose(o: EcontOffice) {
    setPicked(o);
    onPick(o);
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <p className="mb-2 text-sm font-medium">{t('wizard.office_picker')}</p>

      {/* Unmistakable confirmation of the chosen office */}
      {selected && (
        <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-brand/30 bg-brand-50 p-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">
              {t('wizard.office_selected')}
            </p>
            <p className="truncate text-sm font-bold text-foreground">
              {selectedOffice ? `${selectedOffice.city} — ${selectedOffice.name}` : `№ ${selected}`}
            </p>
            {selectedOffice?.address && (
              <p className="truncate text-xs text-muted-fg">{selectedOffice.address}</p>
            )}
          </div>
          <span className="shrink-0 rounded-md bg-brand px-2 py-0.5 font-mono text-xs font-semibold text-brand-fg">
            {selected}
          </span>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="shrink-0 rounded-md p-1 text-brand-700 transition-colors hover:bg-brand/10"
              aria-label={t('wizard.office_change')}
              title={t('wizard.office_change')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('wizard.office_search')}
          className="pl-9"
        />
      </div>

      <div className="mt-3 max-h-56 space-y-1.5 overflow-y-auto">
        {results.map((o) => {
          const isSel = selected === o.code;
          return (
            <button
              key={o.code}
              type="button"
              onClick={() => choose(o)}
              aria-pressed={isSel}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                isSel ? 'bg-brand text-brand-fg shadow-soft' : 'hover:bg-muted',
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  isSel ? 'bg-white/20 text-brand-fg' : 'bg-brand-50 text-brand-700',
                )}
              >
                {isSel ? <Check className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {o.city} — {o.name}
                </span>
                <span className={cn('mt-0.5 block text-xs', isSel ? 'opacity-80' : 'text-muted-fg')}>
                  {t('wizard.office_badge')}
                </span>
              </span>
              <span className={cn('shrink-0 font-mono text-xs', isSel ? 'opacity-90' : 'opacity-70')}>
                {o.code}
              </span>
            </button>
          );
        })}
        {results.length === 0 && (
          <p className="px-1 py-3 text-center text-xs text-muted-fg">{t('wizard.office_none')}</p>
        )}
      </div>
    </div>
  );
}
