import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button, Card, CardBody, Field, Input } from '@/components/ui';
import { LanguageSwitch } from '@/components/controls';
import { Logo } from '@/components/brand/Logo';
import { useToast } from '@/components/ui/toast';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { M, authErrorMessage } from '@/lib/authMessages';

/**
 * Lands here from the password-reset email link. Supabase establishes a recovery
 * session from the URL, so updateUser({ password }) sets the new password for
 * that account. Notifications are bilingual (BG / EN).
 */
export function ResetPasswordPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async () => {
    setMsg(null);
    if (password.length < 8) return setMsg({ ok: false, text: M.passwordShort });
    if (password !== confirm) return setMsg({ ok: false, text: M.passwordMismatch });
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMsg({ ok: true, text: M.resetDone });
      toast.success(M.resetDone);
      setTimeout(() => navigate('/login', { replace: true }), 1400);
    } catch (e) {
      setMsg({ ok: false, text: authErrorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/">
          <Logo />
        </Link>
        <LanguageSwitch />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Card>
            <CardBody className="p-8">
              <h1 className="font-display text-2xl font-extrabold text-foreground">{t('auth.reset_title')}</h1>
              <p className="mt-1.5 text-sm text-muted-fg">{t('auth.reset_subtitle')}</p>

              <div className="mt-6 space-y-4">
                <Field label={t('auth.new_password')}>
                  <Input
                    type="password"
                    name="new-password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                  />
                </Field>
                <Field label={t('auth.confirm_password')}>
                  <Input
                    type="password"
                    name="confirm-password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void save();
                    }}
                  />
                </Field>
                {msg && (
                  <p className={cn('text-sm font-medium', msg.ok ? 'text-emerald-600' : 'text-red-600')}>
                    {msg.text}
                  </p>
                )}
                <Button onClick={save} loading={busy} className="w-full">
                  {t('auth.reset_save')}
                </Button>
                <Link
                  to="/login"
                  className="flex w-full items-center justify-center gap-1.5 border-t border-border pt-4 text-sm text-muted-fg hover:text-brand"
                >
                  <ArrowLeft className="h-4 w-4" /> {t('auth.back_to_login')}
                </Link>
              </div>
            </CardBody>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
