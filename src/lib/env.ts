/**
 * Typed, validated access to the (public) Vite env. Anything secret lives in
 * Edge Function secrets, never here (B.L.A.S.T. — Backend-proxied).
 */
import { z } from 'zod';

const schema = z.object({
  VITE_SUPABASE_URL: z.string().url().default('http://127.0.0.1:54321'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1).default('local-anon-key'),
  VITE_COMPANY_PHONE: z.string().default('07895 909915'),
  VITE_COMPANY_ADDRESS: z
    .string()
    .default('542 Liverpool Road, Eccles, Manchester, M30 7JA'),
});

const parsed = schema.safeParse(import.meta.env);

if (!parsed.success && import.meta.env.PROD) {
  // Fail loud in production builds if misconfigured.
  console.error('Invalid environment configuration', parsed.error.flatten());
}

export const env = parsed.success ? parsed.data : schema.parse({});

export const company = {
  phone: env.VITE_COMPANY_PHONE,
  address: env.VITE_COMPANY_ADDRESS,
  email: 'info@hubenov.co.uk', // TODO(owner): confirm contact email
  domain: 'hubenov.co.uk',
} as const;
