import { useCallback, useEffect, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { Copy, MapPin, Plus, User, Building2, Home, KeyRound } from 'lucide-react';
import { Button, Card, CardBody, Input, Select, Field, Badge, Spinner } from '@/components/ui';
import { PageHeading, EmptyState } from '@/components/shared/common';
import { Stagger, StaggerItem } from '@/components/motion';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { M, authErrorMessage } from '@/lib/authMessages';
import type { Address, AddressKind, Country, Locale } from '@/types/domain';

interface ProfileForm {
  full_name: string;
  phone: string;
  email: string;
  preferred_locale: Locale;
}

interface AddressForm {
  country: Country;
  kind: AddressKind;
  line1: string;
  city: string;
  postcode: string;
  econt_office_code: string;
}

const EMPTY_ADDRESS: AddressForm = {
  country: 'BG',
  kind: 'receiver',
  line1: '',
  city: '',
  postcode: '',
  econt_office_code: '',
};

export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const toast = useToast();
  const { profile, refreshProfile } = useAuth();

  const L =
    locale === 'bg'
      ? {
          account: 'Данни за профила',
          account_hint: 'Тези данни се използват при създаване на пратки.',
          full_name: 'Име и фамилия',
          phone: 'Телефон',
          email: 'Имейл',
          email_optional: 'По желание - за фактури и известия. Входът е с телефонния номер.',
          el_title: 'Вход с имейл и парола (по избор)',
          el_hint: 'Добавете имейл и парола, за да може да влизате и с тях. Входът с телефон продължава да работи.',
          el_email: 'Имейл',
          el_password: 'Нова парола',
          el_password2: 'Потвърди паролата',
          el_save: 'Запази',
          el_saved: 'Готово. Ако се изисква потвърждение, проверете имейла си.',
          el_short: 'Паролата трябва да е поне 8 знака.',
          el_mismatch: 'Паролите не съвпадат.',
          el_need_email: 'Въведете валиден имейл.',
          locale: 'Език',
          copied: 'Копирано',
          add_address: 'Добави адрес',
          new_address: 'Нов адрес',
          country: 'Държава',
          kind: 'Тип',
          sender: 'Подател',
          receiver: 'Получател',
          line1: 'Адрес',
          city: 'Град',
          postcode: 'Пощенски код',
          econt: 'Офис на Еконт (по избор)',
          no_addresses: 'Все още нямате запазени адреси.',
          no_addresses_hint: 'Добавете адрес, за да го избирате бързо при нова пратка.',
          saved: 'Профилът е запазен.',
          address_added: 'Адресът е добавен.',
          adding: 'Добавяне…',
        }
      : {
          account: 'Account details',
          account_hint: 'These details are used when creating shipments.',
          full_name: 'Full name',
          phone: 'Phone',
          email: 'Email',
          email_optional: 'Optional - for invoices and notifications. You sign in with your phone number.',
          el_title: 'Email + password sign-in (optional)',
          el_hint: 'Add an email and password so you can also sign in with them. Phone sign-in keeps working.',
          el_email: 'Email',
          el_password: 'New password',
          el_password2: 'Confirm password',
          el_save: 'Save',
          el_saved: 'Done. If confirmation is required, check your email.',
          el_short: 'Password must be at least 8 characters.',
          el_mismatch: 'Passwords do not match.',
          el_need_email: 'Enter a valid email.',
          locale: 'Language',
          copied: 'Copied',
          add_address: 'Add address',
          new_address: 'New address',
          country: 'Country',
          kind: 'Type',
          sender: 'Sender',
          receiver: 'Receiver',
          line1: 'Address',
          city: 'City',
          postcode: 'Postcode',
          econt: 'Econt office (optional)',
          no_addresses: 'No saved addresses yet.',
          no_addresses_hint: 'Add an address to pick it quickly on a new shipment.',
          saved: 'Profile saved.',
          address_added: 'Address added.',
          adding: 'Adding…',
        };

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { isSubmitting: savingProfile, errors: profileErrors },
  } = useForm<ProfileForm>({
    defaultValues: {
      full_name: '',
      phone: '',
      email: '',
      preferred_locale: 'bg',
    },
  });

  const {
    register: registerAddress,
    handleSubmit: handleAddressSubmit,
    reset: resetAddress,
    formState: { isSubmitting: savingAddress, errors: addressErrors },
  } = useForm<AddressForm>({ defaultValues: EMPTY_ADDRESS });

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  // Optional email + password sign-in (links credentials to THIS account).
  const [elEmail, setElEmail] = useState('');
  const [elPass, setElPass] = useState('');
  const [elPass2, setElPass2] = useState('');
  const [elBusy, setElBusy] = useState(false);
  const [elMsg, setElMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Sync the profile form once the profile is available.
  useEffect(() => {
    if (profile) {
      resetProfile({
        full_name: profile.full_name ?? '',
        phone: profile.phone ?? '',
        email: profile.email ?? '',
        preferred_locale: profile.preferred_locale ?? 'bg',
      });
    }
  }, [profile, resetProfile]);

  const loadAddresses = useCallback(async (profileId: string) => {
    setLoadingAddresses(true);
    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('profile_id', profileId)
        .order('kind', { ascending: true });
      if (error) throw error;
      setAddresses((data ?? []) as Address[]);
    } catch {
      setAddresses([]);
      toast.error(t('common.error'));
    } finally {
      setLoadingAddresses(false);
    }
  }, [toast, t]);

  useEffect(() => {
    if (profile?.id) void loadAddresses(profile.id);
  }, [profile?.id, loadAddresses]);

  // Prefill the email-login field from the profile contact email (often set by
  // the operator at intake), so the client only has to choose a password.
  useEffect(() => {
    if (profile?.email) setElEmail(profile.email);
  }, [profile?.email]);

  const onSaveProfile: SubmitHandler<ProfileForm> = async (values) => {
    if (!profile) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: values.full_name.trim(),
          phone: values.phone.trim() || null,
          email: values.email.trim() || null,
          preferred_locale: values.preferred_locale,
        })
        .eq('id', profile.id);
      if (error) throw error;
      toast.success(L.saved);
      await refreshProfile();
      if (values.preferred_locale !== i18n.resolvedLanguage) {
        void i18n.changeLanguage(values.preferred_locale);
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  // Attach an email + password to the SAME auth account (no new account, so no
  // duplicate). Supabase emails a confirmation when the address is new.
  const onSetupEmailLogin = async () => {
    setElMsg(null);
    const em = elEmail.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) {
      setElMsg({ ok: false, text: M.needEmail });
      return;
    }
    if (elPass.length < 8) {
      setElMsg({ ok: false, text: M.passwordShort });
      return;
    }
    if (elPass !== elPass2) {
      setElMsg({ ok: false, text: M.passwordMismatch });
      return;
    }
    setElBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: em, password: elPass });
      if (error) throw error;
      if (profile && profile.email !== em) {
        await supabase.from('profiles').update({ email: em }).eq('id', profile.id);
        await refreshProfile();
      }
      setElPass('');
      setElPass2('');
      setElMsg({ ok: true, text: M.emailSaved });
      toast.success(M.emailSaved);
    } catch (e) {
      // Surface a bilingual, mapped provider message (e.g. "different from the
      // old password") instead of a raw English string or a generic toast.
      const msg = authErrorMessage(e);
      setElMsg({ ok: false, text: msg });
      toast.error(msg);
    } finally {
      setElBusy(false);
    }
  };

  const onAddAddress: SubmitHandler<AddressForm> = async (values) => {
    if (!profile) return;
    try {
      const { error } = await supabase.from('addresses').insert({
        profile_id: profile.id,
        country: values.country,
        kind: values.kind,
        line1: values.line1.trim(),
        city: values.city.trim(),
        postcode: values.postcode.trim(),
        econt_office_code: values.econt_office_code.trim() || null,
      });
      if (error) throw error;
      toast.success(L.address_added);
      resetAddress(EMPTY_ADDRESS);
      await loadAddresses(profile.id);
    } catch {
      toast.error(t('common.error'));
    }
  };

  const copyCode = () => {
    if (!profile?.client_code) return;
    void navigator.clipboard.writeText(profile.client_code);
    toast.success(L.copied);
  };

  if (!profile) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeading title={t('portal.profile')} subtitle={L.account_hint} />

      <div className="space-y-6">
        {/* Section A — account details */}
        <Card>
          <CardBody>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
                <User className="h-4.5 w-4.5 text-brand" /> {L.account}
              </h2>
              <button
                type="button"
                onClick={copyCode}
                className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-1.5 text-left transition-colors hover:bg-brand-100"
              >
                <span className="text-[11px] font-medium uppercase tracking-wide text-brand-700">
                  {t('portal.your_code')}
                </span>
                <span className="font-mono text-sm font-extrabold text-brand-700">
                  {profile.client_code}
                </span>
                <Copy className="h-3.5 w-3.5 text-brand-700" />
              </button>
            </div>

            <form onSubmit={handleProfileSubmit(onSaveProfile)} className="grid gap-4 sm:grid-cols-2">
              <Field label={L.full_name} htmlFor="full_name" error={profileErrors.full_name?.message}>
                <Input
                  id="full_name"
                  autoComplete="name"
                  {...registerProfile('full_name', { required: t('common.required') })}
                />
              </Field>
              <Field label={L.phone} htmlFor="phone">
                <Input id="phone" type="tel" autoComplete="tel" {...registerProfile('phone')} />
              </Field>
              <Field label={L.email} htmlFor="email">
                <Input id="email" type="email" autoComplete="email" {...registerProfile('email')} />
                <p className="mt-1 text-xs text-muted-fg">{L.email_optional}</p>
              </Field>
              <Field label={L.locale} htmlFor="preferred_locale">
                <Select id="preferred_locale" {...registerProfile('preferred_locale')}>
                  <option value="bg">Български</option>
                  <option value="en">English</option>
                </Select>
              </Field>
              <div className="sm:col-span-2 flex justify-end pt-1">
                <Button type="submit" loading={savingProfile}>
                  {t('common.save')}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {/* Section A2 — optional email + password sign-in */}
        <Card>
          <CardBody>
            <h2 className="mb-1.5 flex items-center gap-2 font-display text-lg font-bold text-foreground">
              <KeyRound className="h-4.5 w-4.5 text-brand" /> {L.el_title}
            </h2>
            <p className="mb-5 text-sm text-muted-fg">{L.el_hint}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={L.el_email} htmlFor="el_email">
                <Input
                  id="el_email"
                  type="email"
                  autoComplete="email"
                  value={elEmail}
                  onChange={(e) => setElEmail(e.target.value)}
                />
              </Field>
              <div className="hidden sm:block" />
              <Field label={L.el_password} htmlFor="el_password">
                <Input
                  id="el_password"
                  type="password"
                  autoComplete="new-password"
                  value={elPass}
                  onChange={(e) => setElPass(e.target.value)}
                />
              </Field>
              <Field label={L.el_password2} htmlFor="el_password2">
                <Input
                  id="el_password2"
                  type="password"
                  autoComplete="new-password"
                  value={elPass2}
                  onChange={(e) => setElPass2(e.target.value)}
                />
              </Field>
              <div className="sm:col-span-2 flex items-center justify-between gap-3">
                {elMsg ? (
                  <p className={cn('text-sm font-medium', elMsg.ok ? 'text-emerald-600' : 'text-red-600')}>
                    {elMsg.text}
                  </p>
                ) : (
                  <span />
                )}
                <Button onClick={onSetupEmailLogin} loading={elBusy} variant="outline">
                  {L.el_save}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Section B — addresses */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-fg">
            <MapPin className="h-4 w-4" /> {t('portal.addresses')} ({addresses.length})
          </h2>

          {loadingAddresses ? (
            <div className="flex justify-center py-10">
              <Spinner className="h-6 w-6" />
            </div>
          ) : addresses.length === 0 ? (
            <EmptyState
              title={L.no_addresses}
              description={L.no_addresses_hint}
              icon={<MapPin className="h-7 w-7" />}
            />
          ) : (
            <Stagger className="grid gap-3 sm:grid-cols-2">
              {addresses.map((a) => (
                <StaggerItem key={a.id}>
                  <Card className="h-full transition-shadow hover:shadow-lift">
                    <CardBody className="py-4">
                      <div className="flex items-center justify-between gap-2">
                        <Badge tone={a.kind === 'sender' ? 'info' : 'brand'}>
                          <span className="flex items-center gap-1">
                            {a.kind === 'sender' ? (
                              <Building2 className="h-3 w-3" />
                            ) : (
                              <Home className="h-3 w-3" />
                            )}
                            {a.kind === 'sender' ? L.sender : L.receiver}
                          </span>
                        </Badge>
                        <Badge tone="neutral">{a.country}</Badge>
                      </div>
                      <p className="mt-2.5 text-sm font-semibold text-foreground">{a.line1}</p>
                      <p className="text-sm text-muted-fg">
                        {a.city}
                        {a.postcode ? ` · ${a.postcode}` : ''}
                      </p>
                      {a.econt_office_code && (
                        <p className="mt-1 font-mono text-xs text-muted-fg">
                          Econt: {a.econt_office_code}
                        </p>
                      )}
                    </CardBody>
                  </Card>
                </StaggerItem>
              ))}
            </Stagger>
          )}

          {/* Add address form */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
            <Card>
              <CardBody>
                <h3 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-foreground">
                  <Plus className="h-4 w-4 text-brand" /> {L.new_address}
                </h3>
                <form
                  onSubmit={handleAddressSubmit(onAddAddress)}
                  className="grid gap-4 sm:grid-cols-2"
                >
                  <Field label={L.country} htmlFor="addr_country">
                    <Select id="addr_country" {...registerAddress('country')}>
                      <option value="BG">България (BG)</option>
                      <option value="GB">United Kingdom (GB)</option>
                    </Select>
                  </Field>
                  <Field label={L.kind} htmlFor="addr_kind">
                    <Select id="addr_kind" {...registerAddress('kind')}>
                      <option value="receiver">{L.receiver}</option>
                      <option value="sender">{L.sender}</option>
                    </Select>
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label={L.line1} htmlFor="addr_line1" error={addressErrors.line1?.message}>
                      <Input
                        id="addr_line1"
                        {...registerAddress('line1', { required: t('common.required') })}
                      />
                    </Field>
                  </div>
                  <Field label={L.city} htmlFor="addr_city" error={addressErrors.city?.message}>
                    <Input
                      id="addr_city"
                      {...registerAddress('city', { required: t('common.required') })}
                    />
                  </Field>
                  <Field
                    label={L.postcode}
                    htmlFor="addr_postcode"
                    error={addressErrors.postcode?.message}
                  >
                    <Input
                      id="addr_postcode"
                      {...registerAddress('postcode', { required: t('common.required') })}
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label={L.econt} htmlFor="addr_econt">
                      <Input
                        id="addr_econt"
                        className={cn('font-mono')}
                        {...registerAddress('econt_office_code')}
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-2 flex justify-end">
                    <Button type="submit" variant="outline" loading={savingAddress} className="gap-2">
                      <Plus className="h-4 w-4" />
                      {savingAddress ? L.adding : L.add_address}
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
