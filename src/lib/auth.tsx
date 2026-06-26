/**
 * Auth context. Phone-OTP is primary (diaspora users may not use email, §7);
 * email/password is available for local-dev demo accounts. Role + profile are
 * loaded from `profiles`; all real authorization is enforced server-side (RLS).
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile, Role } from '@/types/domain';

interface AuthCtx {
  session: Session | null;
  profile: Profile | null;
  role: Role | null;
  loading: boolean;
  isStaff: boolean;
  signInWithPhone: (phone: string) => Promise<void>;
  verifyPhone: (phone: string, token: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithEmailCode: (email: string) => Promise<void>;
  verifyEmailCode: (email: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
    setProfile((data as Profile | null) ?? null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) void loadProfile(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) void loadProfile(s.user.id);
      else setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      session,
      profile,
      role: profile?.role ?? null,
      loading,
      isStaff: profile?.role === 'owner' || profile?.role === 'operator' || profile?.role === 'driver',
      async signInWithPhone(phone) {
        const { error } = await supabase.auth.signInWithOtp({ phone });
        if (error) throw error;
      },
      async verifyPhone(phone, token) {
        const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
        if (error) throw error;
      },
      async signInWithEmail(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      // Passwordless: emails a 6-digit code (no Twilio needed). shouldCreateUser
      // lets a new client self-onboard; the handle_new_user trigger links an
      // existing walk-in profile by email/phone or creates a fresh client one.
      async signInWithEmailCode(email) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true },
        });
        if (error) throw error;
      },
      async verifyEmailCode(email, token) {
        // Existing users get an email-OTP ('email'); brand-new signups get a
        // signup-OTP. Try the common case, fall back so both verify cleanly.
        const first = await supabase.auth.verifyOtp({ email, token, type: 'email' });
        if (!first.error) return;
        const second = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
        if (second.error) throw first.error;
      },
      async signOut() {
        await supabase.auth.signOut();
      },
      async refreshProfile() {
        if (session) await loadProfile(session.user.id);
      },
    }),
    [session, profile, loading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
