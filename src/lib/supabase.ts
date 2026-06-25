import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { env } from './env';

/**
 * Browser Supabase client. Uses the public anon key only — every privileged
 * action goes through RLS or an Edge Function (B.L.A.S.T. / A.N.T.).
 */
export const supabase = createClient<Database>(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

/** Invoke an Edge Function with typed input/output. */
export async function callFunction<TOut>(
  name: string,
  body: Record<string, unknown>,
): Promise<TOut> {
  const { data, error } = await supabase.functions.invoke<TOut>(name, { body });
  if (error) throw error;
  if (data === null) throw new Error(`Edge function ${name} returned no data`);
  return data;
}
