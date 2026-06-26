import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { Search, ShieldCheck, PackageX } from 'lucide-react';
import { Button, Card, CardBody, Input, Spinner } from '@/components/ui';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Timeline } from '@/components/shared/Timeline';
import { Section, PageHeading } from '@/components/shared/common';
import { trackPublic, type PublicTracking } from '@/lib/queries';
import { trackInputSchema } from '@/schemas';

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'found'; data: PublicTracking }
  | { kind: 'not_found' }
  | { kind: 'error' };

export function TrackPage() {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [searchParams] = useSearchParams();

  const runTrack = useCallback(async (raw: string) => {
    const parsed = trackInputSchema.safeParse({ code: raw });
    if (!parsed.success) return;
    setState({ kind: 'loading' });
    try {
      const data = await trackPublic(parsed.data.code);
      setState(data ? { kind: 'found', data } : { kind: 'not_found' });
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

          {state.kind === 'found' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
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
