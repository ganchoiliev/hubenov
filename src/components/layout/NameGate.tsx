/**
 * First-login name capture. Self-signups arrive with an empty full_name (the
 * handle_new_user trigger defaults it to ''), which would leave the operator
 * dashboard and parcels showing only a phone or email. We gate the
 * authenticated app: once a profile loads without a usable name, the user must
 * enter one before continuing. Walk-in clients (name already set by the
 * operator) and staff accounts pass straight through.
 */
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { UserRound } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useUpdateProfile } from '@/lib/queries';
import { Button, Card, CardBody, Field, Input } from '@/components/ui';
import { Logo } from '@/components/brand/Logo';
import { LanguageSwitch } from '@/components/controls';
import { useToast } from '@/components/ui/toast';

function hasUsableName(name: string | null | undefined): boolean {
  return !!name && name.trim().length >= 2;
}

export function NameGate({ children }: { children: ReactNode }) {
  const { session, profile } = useAuth();
  // Only gate once a profile row actually exists — never block on the brief
  // null window right after sign-in, and never on the public/login surfaces
  // (those don't mount this gate at all).
  if (session && profile && !hasUsableName(profile.full_name)) return <NameSetup />;
  return <>{children}</>;
}

function NameSetup() {
  const { t } = useTranslation();
  const toast = useToast();
  const { profile, refreshProfile, signOut } = useAuth();
  const update = useUpdateProfile();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const v = name.trim();
    if (v.length < 2) return toast.error(t('auth.name_required'));
    if (!profile) return;
    setBusy(true);
    try {
      await update.mutateAsync({ id: profile.id, patch: { full_name: v } });
      await refreshProfile(); // gate re-evaluates and renders the app
    } catch {
      toast.error(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <div className="container flex h-16 items-center justify-between">
        <Logo />
        <LanguageSwitch />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <Card>
            <CardBody className="p-8">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <UserRound className="h-5 w-5" />
              </div>
              <h1 className="font-display text-2xl font-extrabold text-foreground">{t('auth.name_title')}</h1>
              <p className="mt-1.5 text-sm text-muted-fg">{t('auth.name_subtitle')}</p>
              <div className="mt-6 space-y-4">
                <Field label={t('auth.name_label')}>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void save();
                    }}
                    placeholder={t('auth.name_placeholder')}
                    autoFocus
                    autoComplete="name"
                  />
                </Field>
                <Button onClick={save} loading={busy} className="w-full">
                  {t('auth.name_continue')}
                </Button>
                <button
                  onClick={() => void signOut()}
                  className="w-full text-sm text-muted-fg hover:text-brand"
                >
                  {t('auth.signout')}
                </button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
