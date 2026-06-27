import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { Search, ShieldCheck, PackageX, ArrowLeft } from 'lucide-react';
import { Button, Card, CardBody, Input, Spinner } from '@/components/ui';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Timeline } from '@/components/shared/Timeline';
import { Section, PageHeading } from '@/components/shared/common';
import { trackPublic, trackAccount, type PublicTracking, type AccountParcel } from '@/lib/queries';
import { trackInputSchema } from '@/schemas';

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'single'; data: PublicTracking; fromAccount?: string }
  | { kind: 'account'; code: string; parcels: AccountParcel[] }
  | { kind: 'not_found' }
  | { kind: 'error' };

const dir = (d: string) => (d === 'UK_BG' ? 'UK → BG' : 'BG → UK');

export function TrackPage() {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [searchParams] = useSearchParams();

  const runTrack = useCallback(async (raw: string, fromAccount?: string) => {
    const parsed = trackInputSchema.safeParse({ code: raw });
    if (!parsed.success) return;
    setState({ kind: 'loading' });
    try {
      // A parcel code (HB-0034) resolves to one parcel; an OT/account code
      // (HB-GY8X) resolves to every parcel on that account.
      const single = await trackPublic(parsed.data.code);
      if (single) {
        setState({ kind: 'single', data: single, fromAccount });
        return;
      }
      const parcels = await trackAccount(parsed.data.code);
      if (parcels.length > 0) {
        setState({ kind: 'account', code: parsed.data.code.trim().toUpperCase(), parcels });
        return;
      }
      setState({ kind: 'not_found' });
    } catch {
      setState({ kind: 'error' });
    }
  }, []);

  const onTrack = (e: React.FormEvent) => {
    e.preventDefault();
    void runTrack(code);
  };

  // Deep-link: /track?code=HB-0006 (e.g. from a status-change email) auto-runs.
  useEffect(() => {
    const c = searchParams.get('code');
    if (!c) return;
    const v = c.trim().toUpperCase();
    setCode(v);
    void runTrack(v);
  }, [searchParams, runTrack]);

  return (
    <Section>
      <div className="mx-auto max-w-2xl">
        <PageHeading title={t('track.title')} subtitle={t('track.subtitle')} />

        <form onSubmit={onTrack} className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t('track.placeholder')}
            className="flex-1 font-mono uppercase"
            autoFocus
          />
          <Button type="submit" size="md" className="gap-2 sm:w-auto">
            <Search className="h-4 w-4" /> {t('track.button')}
          </Button>
        </form>

        <p className="mt-3 flex items-center gap-2 text-xs text-muted-fg">
          <ShieldCheck className="h-3.5 w-3.5 text-brand" />
          {t('track.privacy_note')}
        </p>

        <div className="mt-8">
          {state.kind === 'loading' && (
            <div className="flex justify-center py-10">
              <Spinner className="h-7 w-7" />
            </div>
          )}

          {state.kind === 'not_found' && (
            <Card>
              <CardBody className="flex items-center gap-3 text-muted-fg">
                <PackageX className="h-5 w-5" /> {t('track.not_found')}
              </CardBody>
            </Card>
          )}

          {state.kind === 'error' && (
            <Card>
              <CardBody className="text-danger">{t('common.error')}</CardBody>
            </Card>
          )}

          {state.kind === 'account' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-4 flex items-baseline justify-between">
                <p className="font-mono text-lg font-bold text-foreground">{state.code}</p>
                <p className="text-sm text-muted-fg">
                  {state.parcels.length} {t('track.parcels')}
                </p>
              </div>
              <div className="space-y-2">
                {state.parcels.map((p) => (
                  <button
                    key={p.public_code}
                    type="button"
                    onClick={() => void runTrack(p.public_code, state.code)}
                    className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-brand"
                  >
                    <div>
                      <p className="font-mono font-semibold text-foreground">{p.public_code}</p>
                      <p className="text-xs text-muted-fg">
                        {dir(p.direction)}
                        {p.receiver_city ? ` · ${p.receiver_city}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={p.status} />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {state.kind === 'single' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              {state.fromAccount && (
                <button
                  type="button"
                  onClick={() => void runTrack(state.fromAccount!)}
                  className="mb-4 flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" /> {t('track.back_to_account')}
                </button>
              )}
              <Card>
                <CardBody>
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <p className="font-mono text-lg font-bold text-foreground">{state.data.public_code}</p>
                      <p className="text-xs text-muted-fg">{t('track.current_status')}</p>
                    </div>
                    <StatusBadge status={state.data.status} />
                  </div>
                  <Timeline current={state.data.status} events={state.data.events} />
                </CardBody>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </Section>
  );
}
