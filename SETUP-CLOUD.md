# Hubenov — Supabase Cloud setup (no Docker)

Goal: stand up the backend in the cloud so the app is fully functional, end-to-end — no Docker. ~10 minutes. Steps marked **(you)** are the parts I can't do for you (creating accounts, handling keys/passwords).

---

## 1. Create the project **(you)**
[supabase.com](https://supabase.com) → **New project**
- Region: **EU — Frankfurt** (data residency for GDPR).
- Set a strong **database password** and save it somewhere safe.
- Wait ~2 min for it to provision.

## 2. Copy your keys **(you)**
Project → **Settings → API**, copy:
- **Project URL** (e.g. `https://abcd1234.supabase.co`)
- **anon public** key (the long one labelled `anon` `public`)

> The `anon` key is safe in the browser — RLS protects the data. **Never** put the `service_role` key in `.env`.

## 3. Put the keys in `.env` **(you)**
In the repo root, edit `.env` (copy from `.env.example` if you haven't):
```
VITE_SUPABASE_URL=https://<your-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon public key>
```

## 4. Create the schema + demo data — pick ONE

**A. Fastest (no CLI):** Supabase → **SQL Editor → New query** → paste the entire contents of
`supabase/cloud-bootstrap.sql` → **Run**. (Run once on a fresh project — it creates every table, all RLS,
the functions/triggers, pricing, the weekly load, and the demo accounts/shipments.)

**B. Clean (CLI, keeps migration history, still no Docker):**
```bash
npx supabase login
npx supabase link --project-ref <your-ref>
npx supabase db push          # applies migrations 0001–0004
# then paste supabase/seed.sql into the SQL Editor and Run
```

## 5. Auth settings **(you)**
Authentication → **Providers → Email**: ON (the demo accounts use email login).
- For quick testing, Authentication → **Sign In / Up** → turn **off "Confirm email"** so new sign-ups work instantly. (The seeded demo accounts are already pre-confirmed.)
- Phone OTP (the production login) needs an SMS provider (Twilio) — that's Wave 2, not needed now.

## 6. Regenerate DB types + run
```bash
npx supabase gen types typescript --project-id klvbjzdhcnonsunxkakn src/types/database.types.ts   # optional, needs `supabase login`
npm run dev
```

---

## Demo logins (after step 4)
`owner@hubenov.co.uk` · `operator@hubenov.co.uk` · `client@hubenov.co.uk` — password `password123`.

If they don't work (some Supabase versions reject the direct `auth.users` seed): just **sign up** a new account in the app — it becomes a `client`. To make it staff, Supabase → **Table editor → profiles →** set `role` = `owner` on your row.

## Notes
- **Edge Functions** (`pricing`, `label-render`, `econt-proxy`, `customs-docs`, `track-poll`) are **Wave 2** — not needed now. The app's quote/label/tracking run via the client-side mock provider, so everything is testable without them. Deploy later with `npx supabase functions deploy`.
- The public **track-by-number** uses the `track_public` DB function (created by the bootstrap), not an Edge Function — so it works immediately.
- I can't create the project or paste your keys/password — those are yours. **Ping me once `npm run dev` is pointing at the cloud project** and I'll run the full end-to-end verification (login → book → scan→print → track → messaging) and fix whatever surfaces.
