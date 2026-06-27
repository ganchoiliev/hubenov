import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { Phone, Mail, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button, Card, CardBody, Field, Input, Select } from '@/components/ui';
import { LanguageSwitch } from '@/components/controls';
import { Logo } from '@/components/brand/Logo';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth';
import { otpVerifySchema } from '@/schemas';
import { DIAL_COUNTRIES, DEFAULT_DIAL, toE164, isE164 } from '@/lib/phone';
import { CLIENT_PHONE_ONLY } from '@/config/flags';

type Mode = 'phone' | 'email';
type PhoneStep = 'enter' | 'verify';

export function LoginPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithPhone, verifyPhone, signInWithEmailCode, verifyEmailCode, signInWithEmail, session, role, isStaff } = useAuth();

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
  const [dial, setDial] = useState(DEFAULT_DIAL);
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Email tab defaults to passwordless code; staff accounts (e.g. operator@…)
  // can switch to password so an undeliverable mailbox never locks them out.
  const [emailMethod, setEmailMethod] = useState<'code' | 'password'>('code');
  const [busy, setBusy] = useState(false);

  const switchMode = (m: Mode) => {
    setMode(m);
    setStep('enter');
    setToken('');
  };

  // Phone-only mode hides the client email tab; staff reach email + password
  // through a discreet link that opens the email form on the password method.
  const openStaff = () => {
    setMode('email');
    setEmailMethod('password');
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

  const sendEmailCode = async () => {
    const e = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return toast.error(t('auth.email_invalid'));
    setBusy(true);
    try {
      await signInWithEmailCode(e, { shouldCreateUser: !CLIENT_PHONE_ONLY });
      setStep('verify');
      toast.info(t('auth.code_sent_email', { email: e }));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const verifyEmail = async () => {
    const e = email.trim();
    const code = token.trim();
    if (!e || code.length < 4) return toast.error(t('common.error'));
    setBusy(true);
    try {
      await verifyEmailCode(e, code);
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
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card>
            <CardBody className="p-8">
              <h1 className="font-display text-2xl font-extrabold text-foreground">{t('auth.login_title')}</h1>
              <p className="mt-1.5 text-sm text-muted-fg">
                {mode === 'email'
                  ? t(CLIENT_PHONE_ONLY ? 'auth.login_subtitle_staff' : 'auth.login_subtitle_email')
                  : t('auth.login_subtitle')}
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
                            type="tel"
                            inputMode="tel"
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
                  {CLIENT_PHONE_ONLY ? (
                    <button
                      onClick={openStaff}
                      className="flex w-full items-center justify-center gap-1.5 border-t border-border pt-4 text-xs text-muted-fg hover:text-brand"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" /> {t('auth.staff_login')}
                    </button>
                  ) : (
                    <button
                      onClick={() => switchMode('email')}
                      className="flex w-full items-center justify-center gap-1.5 border-t border-border pt-4 text-sm text-muted-fg hover:text-brand"
                    >
                      <Mail className="h-4 w-4" /> {t('auth.use_email')}
                    </button>
                  )}
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {emailMethod === 'password' ? (
                    <>
                      <Field label={t('auth.email_label')}>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@email.com"
                          autoFocus
                        />
                      </Field>
                      <Field label={t('auth.password_label')}>
                        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                      </Field>
                      <Button onClick={emailLogin} loading={busy} className="w-full">
                        {t('auth.login_title')}
                      </Button>
                      <button
                        onClick={() => setEmailMethod('code')}
                        className="w-full text-sm text-muted-fg hover:text-brand"
                      >
                        {t('auth.use_code')}
                      </button>
                    </>
                  ) : step === 'enter' ? (
                    <>
                      <Field label={t('auth.email_label')}>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@email.com"
                          autoFocus
                        />
                      </Field>
                      <Button onClick={sendEmailCode} loading={busy} className="w-full gap-2">
                        <Mail className="h-4 w-4" /> {t('auth.send_code')}
                      </Button>
                      <button
                        onClick={() => setEmailMethod('password')}
                        className="w-full text-sm text-muted-fg hover:text-brand"
                      >
                        {t('auth.use_password')}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setStep('enter')}
                        className="flex items-center gap-1.5 text-sm text-muted-fg hover:text-foreground"
                      >
                        <ArrowLeft className="h-4 w-4" /> {email}
                      </button>
                      <Field label={t('auth.code_label')}>
                        <Input
                          inputMode="numeric"
                          value={token}
                          onChange={(e) => setToken(e.target.value)}
                          placeholder={t('auth.code_placeholder')}
                          className="text-center font-mono text-lg tracking-[0.5em]"
                          maxLength={10}
                          autoFocus
                        />
                      </Field>
                      <Button onClick={verifyEmail} loading={busy} className="w-full">
                        {t('auth.verify')}
                      </Button>
                      <button onClick={sendEmailCode} className="w-full text-sm text-muted-fg hover:text-brand">
                        {t('auth.resend')}
                      </button>
                    </>
                  )}
                  {!CLIENT_PHONE_ONLY && (
                    <p className="text-xs text-muted-fg">{t('auth.first_login_note')}</p>
                  )}
                  <button
                    onClick={() => switchMode('phone')}
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
