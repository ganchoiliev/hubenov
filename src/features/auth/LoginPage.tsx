import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Phone, Mail, ArrowLeft } from 'lucide-react';
import { Button, Card, CardBody, Field, Input } from '@/components/ui';
import { LanguageSwitch } from '@/components/controls';
import { Logo } from '@/components/brand/Logo';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth';
import { phoneLoginSchema, otpVerifySchema } from '@/schemas';

type Mode = 'phone' | 'email';
type PhoneStep = 'enter' | 'verify';

export function LoginPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithPhone, verifyPhone, signInWithEmail, session, role, isStaff } = useAuth();

  // After auth, route by role: staff → operator console, clients → portal.
  // Wait until the profile (role) resolves — otherwise the brief null-profile
  // window after sign-in would fall through to /portal and unmount this page
  // before the staff branch could correct it. A deep-link (set when bounced from
  // a protected page) is only honored if it belongs to the user's own area, so
  // staff never land in the client portal.
  useEffect(() => {
    if (!session || !role) return;
    const explicitFrom = (location.state as { from?: string } | null)?.from;
    const area = isStaff ? '/op' : '/portal';
    const target = explicitFrom && explicitFrom.startsWith(area) ? explicitFrom : area;
    navigate(target, { replace: true });
  }, [session, role, isStaff, location.state, navigate]);

  const [mode, setMode] = useState<Mode>('phone');
  const [step, setStep] = useState<PhoneStep>('enter');
  const [phone, setPhone] = useState('');
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    const parsed = phoneLoginSchema.safeParse({ phone });
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? t('common.error'));
    setBusy(true);
    try {
      await signInWithPhone(parsed.data.phone);
      setStep('verify');
      toast.info(t('auth.code_sent', { phone }));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    const parsed = otpVerifySchema.safeParse({ phone, token });
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? t('common.error'));
    setBusy(true);
    try {
      await verifyPhone(parsed.data.phone, parsed.data.token);
      toast.success(t('portal.welcome', { name: '' }));
      // redirect handled by the role-based effect once the session is set
    } catch {
      toast.error(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const emailLogin = async () => {
    setBusy(true);
    try {
      await signInWithEmail(email, password);
      // redirect handled by the role-based effect once the session is set
    } catch {
      toast.error(t('common.error'));
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
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card>
            <CardBody className="p-8">
              <h1 className="font-display text-2xl font-extrabold text-foreground">{t('auth.login_title')}</h1>
              <p className="mt-1.5 text-sm text-muted-fg">{t('auth.login_subtitle')}</p>

              {mode === 'phone' ? (
                <div className="mt-6 space-y-4">
                  {step === 'enter' ? (
                    <>
                      <Field label={t('auth.phone_label')}>
                        <Input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder={t('auth.phone_placeholder')}
                          autoFocus
                        />
                      </Field>
                      <Button onClick={sendCode} loading={busy} className="w-full gap-2">
                        <Phone className="h-4 w-4" /> {t('auth.send_code')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setStep('enter')}
                        className="flex items-center gap-1.5 text-sm text-muted-fg hover:text-foreground"
                      >
                        <ArrowLeft className="h-4 w-4" /> {phone}
                      </button>
                      <Field label={t('auth.code_label')}>
                        <Input
                          inputMode="numeric"
                          value={token}
                          onChange={(e) => setToken(e.target.value)}
                          placeholder={t('auth.code_placeholder')}
                          className="text-center font-mono text-lg tracking-[0.5em]"
                          maxLength={6}
                          autoFocus
                        />
                      </Field>
                      <Button onClick={verify} loading={busy} className="w-full">
                        {t('auth.verify')}
                      </Button>
                      <button onClick={sendCode} className="w-full text-sm text-muted-fg hover:text-brand">
                        {t('auth.resend')}
                      </button>
                    </>
                  )}
                  <p className="text-xs text-muted-fg">{t('auth.first_login_note')}</p>
                  <button
                    onClick={() => setMode('email')}
                    className="flex w-full items-center justify-center gap-1.5 border-t border-border pt-4 text-sm text-muted-fg hover:text-brand"
                  >
                    <Mail className="h-4 w-4" /> {t('auth.use_email')}
                  </button>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <Field label={t('auth.email_label')}>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
                  </Field>
                  <Field label="••••••••">
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </Field>
                  <Button onClick={emailLogin} loading={busy} className="w-full">
                    {t('auth.login_title')}
                  </Button>
                  <button
                    onClick={() => setMode('phone')}
                    className="flex w-full items-center justify-center gap-1.5 border-t border-border pt-4 text-sm text-muted-fg hover:text-brand"
                  >
                    <Phone className="h-4 w-4" /> {t('auth.phone_label')}
                  </button>
                </div>
              )}
            </CardBody>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
