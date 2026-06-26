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
  // WhatsApp/Viber number (international or UK-local). Falls back to the phone.
  VITE_COMPANY_WHATSAPP: z.string().default(''),
  // 'true' once the econt-proxy Edge Function is deployed + credentials are set.
  // Full live last-mile (offices + labels + COD + tracking). Needs the owner's Econt account.
  VITE_ECONT_ENABLED: z.string().default('false'),
  // 'true' to use ONLY live Econt offices (read-only nomenclature, works on demo creds);
  // pricing/labels/COD/tracking stay mock/manual until the owner's Econt account is live.
  VITE_ECONT_OFFICES_LIVE: z.string().default('false'),
});

const parsed = schema.safeParse(import.meta.env);

if (!parsed.success && import.meta.env.PROD) {
  // Fail loud in production builds if misconfigured.
  console.error('Invalid environment configuration', parsed.error.flatten());
}

export const env = parsed.success ? parsed.data : schema.parse({});

export const company = {
  phone: env.VITE_COMPANY_PHONE,
  whatsapp: env.VITE_COMPANY_WHATSAPP || env.VITE_COMPANY_PHONE,
  address: env.VITE_COMPANY_ADDRESS,
  email: 'info@hubenov.delivery', // TODO(owner): confirm contact mailbox is set up
  domain: 'hubenov.delivery',
} as const;
