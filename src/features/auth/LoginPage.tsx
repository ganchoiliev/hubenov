import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { Phone, Mail, ArrowLeft } from 'lucide-react';
import { Button, Card, CardBody, Field, Input, Select } from '@/components/ui';
import { LanguageSwitch } from '@/components/controls';
import { Logo } from '@/components/brand/Logo';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth';
import { otpVerifySchema } from '@/schemas';
import { DIAL_COUNTRIES, DEFAULT_DIAL, toE164, isE164 } from '@/lib/phone';

type Mode = 'phone' | 'email';
type PhoneStep = 'enter' | 'verify';

/**
 * Login model:
 *  - Clients sign in / sign up with PHONE only (one canonical identity, so no
 *    duplicate phone-vs-email accounts can ever form). Phone OTP starts working
 *    the moment Infobip is live; nothing to flip here.
 *  - A discreet "email" link opens email + PASSWORD. That serves staff
 *    (operator@…) and any client who set a password in their dashboard. There
 *    is no email-code (OTP) path: email can never CREATE an account, so it can
 *    never spawn a duplicate.
 */
export function LoginPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithPhone, verifyPhone, signInWithEmail, session, role, isStaff } = useAuth();

  // After auth, route by role: staff → operator console, clients → portal.
  // Wait until the profile (role) resolves so a brief null-profile window does
  // not bounce staff into the client portal. A deep-link is honored only if it
  // belongs to the user's own area.
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
  const [dial, setDial] = useState(DEFAULT_DIAL);
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const goPhone = () => {
    setMode('phone');
    setStep('enter');
    setToken('');
  };
  const goEmail = () => {
    setMode('email');
    setStep('enter');
    setToken('');
  };

  const sendCode = async () => {
    const e164 = toE164(dial, phone);
    if (!isE164(e164)) return toast.error(t('auth.phone_invalid'));
    setBusy(true);
    try {
      await signInWithPhone(e164);
      setStep('verify');
      toast.info(t('auth.code_sent', { phone: e164 }));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    const e164 = toE164(dial, phone);
    const parsed = otpVerifySchema.safeParse({ phone: e164, token });
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? t('common.error'));
    setBusy(true);
    try {
      await verifyPhone(e164, parsed.data.token);
      toast.success(t('portal.welcome', { name: '' }));
      // redirect handled by the role-based effect once the session is set
    } catch {
      toast.error(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const emailLogin = async () => {
    if (!email.trim() || !password) return toast.error(t('common.error'));
    setBusy(true);
    try {
      await signInWithEmail(email.trim(), password);
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
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Card>
            <CardBody className="p-8">
              <h1 className="font-display text-2xl font-extrabold text-foreground">{t('auth.login_title')}</h1>
              <p className="mt-1.5 text-sm text-muted-fg">
                {t(mode === 'email' ? 'auth.login_subtitle_email' : 'auth.login_subtitle')}
              </p>

              {mode === 'phone' ? (
                <div className="mt-6 space-y-4">
                  {step === 'enter' ? (
                    <>
                      <Field label={t('auth.phone_label')}>
                        <div className="flex gap-2">
                          <Select
                            aria-label={t('auth.country_code')}
                            value={dial}
                            onChange={(e) => setDial(e.target.value)}
                            className="w-32 shrink-0"
                          >
                            {DIAL_COUNTRIES.map((c) => (
                              <option key={c.code} value={c.dial}>
                                {c.flag} {c.dial}
                              </option>
                            ))}
                          </Select>
                          <Input
                            id="tel"
                            name="tel"
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder={t('auth.phone_placeholder')}
                            autoFocus
                            className="flex-1"
                          />
                        </div>
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
                        <ArrowLeft className="h-4 w-4" /> {dial} {phone}
                      </button>
                      <Field label={t('auth.code_label')}>
                        <Input
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          name="one-time-code"
                          value={token}
                          onChange={(e) => setToken(e.target.value)}
                          placeholder={t('auth.code_placeholder')}
                          className="text-center font-mono text-lg tracking-[0.5em]"
                          maxLength={10}
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
                  <p className="text-xs text-muted-fg">{t('auth.phone_help')}</p>
                  <button
                    onClick={goEmail}
                    className="flex w-full items-center justify-center gap-1.5 border-t border-border pt-4 text-xs text-muted-fg hover:text-brand"
                  >
                    <Mail className="h-3.5 w-3.5" /> {t('auth.use_email')}
                  </button>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <Field label={t('auth.email_label')}>
                    <Input
                      type="email"
                      name="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      autoFocus
                    />
                  </Field>
                  <Field label={t('auth.password_label')}>
                    <Input
                      type="password"
                      name="current-password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </Field>
                  <Button onClick={emailLogin} loading={busy} className="w-full">
                    {t('auth.login_title')}
                  </Button>
                  <button
                    onClick={goPhone}
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
