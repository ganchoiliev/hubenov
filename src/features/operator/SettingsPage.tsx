import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Save, SlidersHorizontal, KeyRound, Printer, Download } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, Input, Select, Spinner, Skeleton, Badge, Switch } from '@/components/ui';
import { PageHeading, EmptyState } from '@/components/shared/common';
import { Stagger, StaggerItem } from '@/components/motion';
import { useToast } from '@/components/ui/toast';
import { supabase } from '@/lib/supabase';
import { useCompanySettings, useUpdateCompanySettings } from '@/lib/queries';
import { cn, formatMoney } from '@/lib/utils';
import type { Direction, PricingRate } from '@/types/domain';

const DIRECTIONS: Direction[] = ['UK_BG', 'BG_UK'];

interface RowEdit {
  price: number;
  surcharge_remote: number;
}

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const intlLocale = locale === 'en' ? 'en-GB' : 'bg-BG';
  const toast = useToast();

  const L =
    locale === 'bg'
      ? {
          placeholder_title: 'Примерни тарифи',
          placeholder_text:
            'Това са примерни (placeholder) стойности. Собственикът трябва да зададе реалните тарифи преди стартиране на ценообразуването.',
          direction_uk_bg: 'Великобритания → България',
          direction_bg_uk: 'България → Великобритания',
          weight_range: 'Тегловен диапазон',
          base_price: 'Базова цена',
          surcharge_remote: 'Надбавка отдалечен район',
          save_row: 'Запази реда',
          saved: 'Тарифата е запазена',
          save_error: 'Запазването не бе успешно',
          empty_title: 'Няма зададени тарифи',
          empty_desc: 'Все още няма редове в таблицата с тарифи.',
          load_error: 'Тарифите не можаха да се заредят.',
          todo: 'TODO: добавяне/изтриване на редове, обемно тегло и надбавка за подарък.',
        }
      : {
          placeholder_title: 'Placeholder rates',
          placeholder_text:
            'These are placeholder values. The owner must set the real tariffs before pricing goes live.',
          direction_uk_bg: 'United Kingdom → Bulgaria',
          direction_bg_uk: 'Bulgaria → United Kingdom',
          weight_range: 'Weight range',
          base_price: 'Base price',
          surcharge_remote: 'Remote area surcharge',
          save_row: 'Save row',
          saved: 'Rate saved',
          save_error: 'Save failed',
          empty_title: 'No rates configured',
          empty_desc: 'There are no rows in the pricing table yet.',
          load_error: 'Failed to load pricing rates.',
          todo: 'TODO: add/remove rows, volumetric weight and gift surcharge.',
        };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['pricing_rates'],
    queryFn: async (): Promise<PricingRate[]> => {
      const { data: rows, error } = await supabase
        .from('pricing_rates')
        .select('*')
        .order('direction')
        .order('weight_from_kg');
      if (error) throw error;
      return (rows ?? []) as PricingRate[];
    },
  });

  const [edits, setEdits] = useState<Record<string, RowEdit>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Seed local edit state once rows arrive (and when fresh rows differ).
  useEffect(() => {
    if (!data) return;
    setEdits((prev) => {
      const next: Record<string, RowEdit> = { ...prev };
      for (const row of data) {
        if (!next[row.id]) {
          next[row.id] = { price: row.price, surcharge_remote: row.surcharge_remote };
        }
      }
      return next;
    });
  }, [data]);

  const setField = (id: string, field: keyof RowEdit, value: number) => {
    setEdits((prev) => {
      const base: RowEdit = prev[id] ?? { price: 0, surcharge_remote: 0 };
      const updated: RowEdit = { ...base, [field]: Number.isFinite(value) ? value : 0 };
      return { ...prev, [id]: updated };
    });
  };

  const saveRow = async (row: PricingRate) => {
    const edit = edits[row.id];
    if (!edit) return;
    setSavingId(row.id);
    try {
      const { error } = await supabase
        .from('pricing_rates')
        .update({ price: edit.price, surcharge_remote: edit.surcharge_remote })
        .eq('id', row.id);
      if (error) throw error;
      toast.success(L.saved);
    } catch {
      toast.error(L.save_error);
    } finally {
      setSavingId(null);
    }
  };

  const directionLabel = (dir: Direction): string =>
    dir === 'UK_BG' ? L.direction_uk_bg : L.direction_bg_uk;

  const rows = data ?? [];
  const grouped = DIRECTIONS.map((dir) => ({
    dir,
    rows: rows.filter((r) => r.direction === dir),
  })).filter((g) => g.rows.length > 0);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeading title={t('operator.settings')} subtitle={t('operator.pricing_editor')} />

      <CompanySettingsCard lang={locale} />
      <PrintStationCard lang={locale} />
      <ChangePasswordCard lang={locale} />

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title={L.load_error}
          icon={<AlertTriangle className="h-7 w-7" />}
        />
      ) : grouped.length === 0 ? (
        <EmptyState
          title={L.empty_title}
          description={L.empty_desc}
          icon={<SlidersHorizontal className="h-7 w-7" />}
        />
      ) : (
        <Stagger className="space-y-6">
          {grouped.map((group) => (
            <StaggerItem key={group.dir}>
              <Card>
                <CardHeader className="flex items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 font-display text-base font-bold text-foreground">
                    <SlidersHorizontal className="h-4 w-4 text-brand" />
                    {directionLabel(group.dir)}
                  </h2>
                  <Badge tone="brand">{group.rows.length}</Badge>
                </CardHeader>
                <CardBody className="space-y-3 pt-4">
                  {/* Column labels (md+) */}
                  <div className="hidden grid-cols-[1.3fr_1fr_1fr_auto] gap-3 px-1 text-xs font-medium uppercase tracking-wide text-muted-fg md:grid">
                    <span>{L.weight_range}</span>
                    <span>{L.base_price}</span>
                    <span>{L.surcharge_remote}</span>
                    <span className="sr-only">{t('common.actions')}</span>
                  </div>

                  {group.rows.map((row) => {
                    const edit = edits[row.id] ?? {
                      price: row.price,
                      surcharge_remote: row.surcharge_remote,
                    };
                    const dirty =
                      edit.price !== row.price || edit.surcharge_remote !== row.surcharge_remote;
                    const saving = savingId === row.id;
                    return (
                      <div
                        key={row.id}
                        className={cn(
                          'grid grid-cols-1 items-end gap-3 rounded-xl border border-border bg-background p-3',
                          'md:grid-cols-[1.3fr_1fr_1fr_auto] md:items-center',
                          dirty && 'border-brand/40',
                        )}
                      >
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-semibold text-foreground">
                            {row.weight_from_kg}–{row.weight_to_kg} {t('common.kg')}
                          </p>
                          <p className="text-xs text-muted-fg md:hidden">{L.base_price}</p>
                        </div>

                        <label className="block">
                          <span className="mb-1 block text-xs text-muted-fg md:hidden">
                            {L.base_price}
                          </span>
                          <div className="relative">
                            <Input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              step="0.01"
                              value={Number.isFinite(edit.price) ? edit.price : 0}
                              onChange={(e) => setField(row.id, 'price', e.target.valueAsNumber)}
                              className="font-mono"
                              aria-label={`${L.base_price} ${row.weight_from_kg}-${row.weight_to_kg}`}
                            />
                          </div>
                          <span className="mt-1 block text-[11px] text-muted-fg">
                            {formatMoney(edit.price || 0, row.currency, intlLocale)}
                          </span>
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-xs text-muted-fg md:hidden">
                            {L.surcharge_remote}
                          </span>
                          <Input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="0.01"
                            value={Number.isFinite(edit.surcharge_remote) ? edit.surcharge_remote : 0}
                            onChange={(e) =>
                              setField(row.id, 'surcharge_remote', e.target.valueAsNumber)
                            }
                            className="font-mono"
                            aria-label={`${L.surcharge_remote} ${row.weight_from_kg}-${row.weight_to_kg}`}
                          />
                        </label>

                        <Button
                          type="button"
                          size="sm"
                          variant={dirty ? 'primary' : 'outline'}
                          loading={saving}
                          disabled={!dirty || saving}
                          onClick={() => void saveRow(row)}
                          className="w-full md:w-auto"
                        >
                          {!saving && <Save className="h-4 w-4" />}
                          {L.save_row}
                        </Button>
                      </div>
                    );
                  })}
                </CardBody>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {/* subtle inline activity hint while a save is in flight */}
      {savingId && (
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-fg">
          <Spinner className="h-3.5 w-3.5" /> {t('common.loading')}
        </div>
      )}
    </div>
  );
}

function CompanySettingsCard({ lang }: { lang: 'bg' | 'en' }) {
  const toast = useToast();
  const { data, isLoading } = useCompanySettings();
  const update = useUpdateCompanySettings();
  const [eori, setEori] = useState('');
  const [labelSize, setLabelSize] = useState<'A6' | '100x150' | 'A4'>('A6');
  const [printMethod, setPrintMethod] = useState<'browser' | 'qz'>('browser');
  const [returnAddr, setReturnAddr] = useState('');
  const [notify, setNotify] = useState(true);

  useEffect(() => {
    if (!data) return;
    setEori(data.eori ?? '');
    setLabelSize(data.label_size);
    setPrintMethod(data.print_method);
    setReturnAddr(data.return_address ?? '');
    setNotify(data.notify_status_emails ?? true);
  }, [data]);

  const T =
    lang === 'bg'
      ? {
          title: 'Фирмени настройки',
          sub: 'Митница и печат на етикети — задават се веднъж от собственика.',
          eori: 'EORI номер',
          eoriHint: 'Нужен за митница при износ от UK. Печата се на търговската фактура.',
          label: 'Размер на етикета',
          method: 'Метод на печат',
          mBrowser: 'Браузър (PDF) — всеки принтер',
          mQz: 'QZ Tray (тих печат) — термопринтер',
          ret: 'Адрес за връщане (по избор)',
          notify: 'Имейл известия до клиентите',
          notifyHint: 'Изпраща имейл при ключови етапи (заявена, тръгнала от UK, доставена…). Може да се изключи и за отделен клиент.',
          save: 'Запази',
          saved: 'Запазено',
          err: 'Грешка при запазване',
        }
      : {
          title: 'Company settings',
          sub: 'Customs & label printing — set once by the owner.',
          eori: 'EORI number',
          eoriHint: 'Required for UK export customs; printed on the commercial invoice.',
          label: 'Label size',
          method: 'Print method',
          mBrowser: 'Browser (PDF) — any printer',
          mQz: 'QZ Tray (silent) — thermal printer',
          ret: 'Return address (optional)',
          notify: 'Status emails to clients',
          notifyHint: 'Emails clients at key milestones (booked, departed UK, delivered…). Can also be turned off per client.',
          save: 'Save',
          saved: 'Saved',
          err: 'Save failed',
        };

  const save = async () => {
    try {
      await update.mutateAsync({
        eori: eori.trim() || null,
        label_size: labelSize,
        print_method: printMethod,
        return_address: returnAddr.trim() || null,
        notify_status_emails: notify,
      });
      toast.success(T.saved);
    } catch {
      toast.error(T.err);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <h2 className="flex items-center gap-2 font-display text-base font-bold text-foreground">
          <SlidersHorizontal className="h-4 w-4 text-brand" /> {T.title}
        </h2>
      </CardHeader>
      <CardBody className="space-y-4 pt-4">
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <>
            <p className="text-sm text-muted-fg">{T.sub}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">{T.eori}</span>
                <Input value={eori} onChange={(e) => setEori(e.target.value)} placeholder="GB123456789000" className="font-mono" />
                <span className="mt-1 block text-xs text-muted-fg">{T.eoriHint}</span>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">{T.ret}</span>
                <Input value={returnAddr} onChange={(e) => setReturnAddr(e.target.value)} placeholder="542 Liverpool Road, Eccles, M30 7JA" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">{T.label}</span>
                <Select value={labelSize} onChange={(e) => setLabelSize(e.target.value as 'A6' | '100x150' | 'A4')}>
                  <option value="A6">A6 (105×148 mm)</option>
                  <option value="100x150">100×150 mm</option>
                  <option value="A4">A4</option>
                </Select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">{T.method}</span>
                <Select value={printMethod} onChange={(e) => setPrintMethod(e.target.value as 'browser' | 'qz')}>
                  <option value="browser">{T.mBrowser}</option>
                  <option value="qz">{T.mQz}</option>
                </Select>
              </label>
            </div>
            <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background p-4">
              <div>
                <p className="text-sm font-medium text-foreground">{T.notify}</p>
                <p className="mt-0.5 text-xs text-muted-fg">{T.notifyHint}</p>
              </div>
              <Switch checked={notify} onChange={setNotify} id="notify-status" />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => void save()} loading={update.isPending} className="gap-2">
                <Save className="h-4 w-4" /> {T.save}
              </Button>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}

function PrintStationCard({ lang }: { lang: 'bg' | 'en' }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://hubenov.delivery';

  const bat =
    `@echo off\r\n` +
    `REM Доставки Хубенов — станция за печат\r\n` +
    `set CHROME="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"\r\n` +
    `if not exist %CHROME% set CHROME="C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"\r\n` +
    `start "" %CHROME% --kiosk-printing --user-data-dir="%LOCALAPPDATA%\\HubenovStation" "${origin}/op/scan"\r\n`;

  const command =
    `#!/bin/bash\n` +
    `open -na "Google Chrome" --args --kiosk-printing --user-data-dir="$HOME/Library/Application Support/HubenovStation" "${origin}/op/scan"\n`;

  const download = (filename: string, text: string) => {
    const blob = new Blob([text], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const T =
    lang === 'bg'
      ? {
          title: 'Станция за печат',
          intro: 'Автоматичен печат без диалог — всеки сканиран етикет излиза директно на принтера по подразбиране.',
          win: 'Свали стартер (Windows)',
          mac: 'Mac версия',
          steps: 'Стъпки (Windows):',
          s: [
            'Задай принтера за етикети като „по подразбиране" (Settings → Bluetooth & devices → Printers).',
            'Натисни „Свали стартер (Windows)" и запази файла (ако браузърът предупреди — „Keep").',
            'Сложи файла на работния плот (Desktop).',
            'Двойно щракване. При първо стартиране: „More info" → „Run anyway".',
            'Влез веднъж и сканирай — етикетите се печатат автоматично.',
          ],
          macSteps: 'Стъпки (Mac):',
          ms: [
            'Задай принтера по подразбиране (Системни настройки → Принтери).',
            'Натисни „Mac версия" и запази файла.',
            'Отвори Терминал и въведи: chmod +x ~/Downloads/Доставки-Хубенов-Печат.command',
            'Премести файла на работния плот и двойно щракни (десен бутон → Open при първо стартиране).',
          ],
          qzTitle: 'Алтернатива: QZ Tray (тих печат)',
          qzNote: 'Без kiosk Chrome — инсталирай QZ Tray и избери „QZ" като метод за печат във „Фирмени настройки".',
          qzLink: 'Изтегли QZ Tray',
        }
      : {
          title: 'Print station',
          intro: 'Silent printing — every scanned label prints straight to the default printer, no dialog.',
          win: 'Download launcher (Windows)',
          mac: 'Mac version',
          steps: 'Steps (Windows):',
          s: [
            'Set the label printer as default (Settings → Bluetooth & devices → Printers).',
            'Click "Download launcher (Windows)" and keep the file (if warned — "Keep").',
            'Put the file on the Desktop.',
            'Double-click it. First run: "More info" → "Run anyway".',
            'Log in once and scan — labels print automatically.',
          ],
          macSteps: 'Steps (Mac):',
          ms: [
            'Set the label printer as default (System Settings → Printers).',
            'Click "Mac version" and save the file.',
            'Open Terminal and run: chmod +x ~/Downloads/Доставки-Хубенов-Печат.command',
            'Move it to the Desktop and double-click (right-click → Open on first run).',
          ],
          qzTitle: 'Alternative: QZ Tray (silent)',
          qzNote: 'No kiosk Chrome — install QZ Tray and set Print method = QZ in Company settings above.',
          qzLink: 'Download QZ Tray',
        };

  return (
    <Card className="mb-6">
      <CardHeader>
        <h2 className="flex items-center gap-2 font-display text-base font-bold text-foreground">
          <Printer className="h-4 w-4 text-brand" /> {T.title}
        </h2>
      </CardHeader>
      <CardBody className="space-y-4 pt-4">
        <p className="text-sm text-muted-fg">{T.intro}</p>
        <div className="flex flex-wrap gap-2">
          <Button className="gap-2" onClick={() => download('Hubenov-Print-Station.bat', bat)}>
            <Download className="h-4 w-4" /> {T.win}
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => download('Доставки-Хубенов-Печат.command', command)}
          >
            <Download className="h-4 w-4" /> {T.mac}
          </Button>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-semibold text-foreground">{T.steps}</p>
          <ol className="space-y-1.5 text-sm text-muted-fg">
            {T.s.map((step, i) => (
              <li key={i}>
                {i + 1}. {step}
              </li>
            ))}
          </ol>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-semibold text-foreground">{T.macSteps}</p>
          <ol className="space-y-1.5 text-sm text-muted-fg">
            {T.ms.map((step, i) => (
              <li key={i}>
                {i + 1}. {step}
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <p className="text-sm font-semibold text-foreground">{T.qzTitle}</p>
          <p className="mt-1 text-xs text-muted-fg">{T.qzNote}</p>
          <a
            href="https://qz.io/download/"
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 inline-block text-xs text-brand"
          >
            {T.qzLink} ↗
          </a>
        </div>
      </CardBody>
    </Card>
  );
}

function ChangePasswordCard({ lang }: { lang: 'bg' | 'en' }) {
  const toast = useToast();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);

  const T =
    lang === 'bg'
      ? {
          title: 'Смяна на парола',
          neu: 'Нова парола',
          confirm: 'Повтори паролата',
          save: 'Запази паролата',
          saved: 'Паролата е сменена',
          short: 'Минимум 6 символа',
          mismatch: 'Паролите не съвпадат',
          err: 'Грешка при смяна на паролата',
        }
      : {
          title: 'Change password',
          neu: 'New password',
          confirm: 'Confirm password',
          save: 'Update password',
          saved: 'Password changed',
          short: 'At least 6 characters',
          mismatch: 'Passwords do not match',
          err: 'Could not change password',
        };

  const submit = async () => {
    if (pw.length < 6) {
      toast.error(T.short);
      return;
    }
    if (pw !== pw2) {
      toast.error(T.mismatch);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      toast.success(T.saved);
      setPw('');
      setPw2('');
    } catch {
      toast.error(T.err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <h2 className="flex items-center gap-2 font-display text-base font-bold text-foreground">
          <KeyRound className="h-4 w-4 text-brand" /> {T.title}
        </h2>
      </CardHeader>
      <CardBody className="space-y-4 pt-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{T.neu}</span>
            <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{T.confirm}</span>
            <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
          </label>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => void submit()} loading={busy} className="gap-2">
            <KeyRound className="h-4 w-4" /> {T.save}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
