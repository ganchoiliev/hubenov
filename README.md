# Доставки Хубенов · Hubenov Deliveries

Production-grade web platform for a **UK ⇄ Bulgaria** parcel logistics company serving the
Bulgarian diaspora. Own transport UK→BG (**a van every Friday** from Manchester) + **Econt** for
Bulgarian last-mile. Bulgarian-first (`bg`), English secondary (`en`).

> **Status: Wave 1.** Everything works end-to-end with a **mocked courier** and **seed data** —
> no external accounts required to demo. Wave 2 wires live Econt + customs + notifications.

---

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | React 18 · Vite · **TypeScript (strict)** · Tailwind · Framer Motion · React Router · TanStack Query · react-hook-form + Zod · react-i18next (`bg` default) |
| Backend | **Supabase** (EU/Frankfurt) — Postgres + **RLS** · Auth (phone OTP) · Realtime · Storage · **Edge Functions** (Deno) |
| Barcodes / labels | `bwip-js` (Code128) · `pdf-lib` (4×6" PDF) |
| Printing | `PrintAdapter` → `BrowserPdfAdapter` (now) / `QzTrayAdapter` (Wave 2) |
| Courier | `CourierProvider` → `MockEcontProvider` (now) / `EcontProvider` via `econt-proxy` (Wave 2) |

Engineering contract: **B.L.A.S.T.** (Backend-proxied secrets · Least-privilege RLS · Automated CI/migrations ·
Secure: Zod + rate-limit + audit log · Typed & tested) and **A.N.T.** (API-first · No-trust client · Tenant-isolated).

---

## Quick start

```bash
# 1. Install
npm install

# 2. Start Supabase locally (needs Docker) — Postgres + Auth + Storage + Edge runtime
supabase start

# 3. Apply migrations + seed (idempotent, reproducible from scratch)
npm run db:reset        # = supabase db reset

# 4. Generate DB types from the live local schema (replaces the placeholder)
npm run db:types

# 5. Env: copy and fill from `supabase status`
cp .env.example .env    # set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY

# 6. Run
npm run dev             # http://localhost:5173
```

Quality gates (what CI runs):

```bash
npm run typecheck   # strict tsc, no `any`
npm run lint        # eslint, no warnings
npm test            # vitest — pricing / customs / schedule / status / codes
npm run build       # production build
```

### Demo accounts (seeded, local dev)

Sign in at `/login` → **"Вход с имейл / Sign in with email"** (production uses phone OTP):

| Role | Email | Password |
| --- | --- | --- |
| Owner | `owner@hubenov.co.uk` | `password123` |
| Operator | `operator@hubenov.co.uk` | `password123` |
| Client | `client@hubenov.co.uk` | `password123` |

Try **public tracking** at `/track` with `HB-2406-0001` (status only — never PII).
Try the **scan station** at `/op/scan`: type `HB-2406-0001` + Enter → label prints automatically.

---

## Surfaces

- **Public** (`/`) — hero + next-Friday countdown, services, **instant quote** (`/quote`), **track-by-number**
  (`/track`, PII-safe), coverage, about, contact, FAQ. BG/EN switch persisted.
- **Client portal** (`/portal`) — dashboard, **new-shipment wizard** (Econt office picker), shipments + **live
  tracking timeline**, invoices, realtime messaging, profile/addresses.
- **Operator console** (`/op`) — **OT-code lookup**, intake, **scan → print station** (signature feature),
  load/manifest builder, shipment management, invoicing + payment recording, pricing editor.

### Signature feature — scan → label in one motion (`/op/scan`)

A USB barcode scanner is just a keyboard (types a code + Enter), so the flow is fully testable with no
hardware. On Enter: resolve shipment → build the 4×6 PDF → `PrintAdapter.print()` → set `at_uk_hub` + write a
tracking event the client sees live. **Target: scan → printed ≤ 2 s, ≤ 1 keystroke** (the station shows the
measured ms per scan). Offline-tolerant: the print queues and syncs on reconnect.

---

## Project layout

```
src/
  lib/            supabase, auth, i18n, env, pricing, label, customs, schedule, status, codes, queries
  schemas/        Zod schemas (shared client + Edge Function validation)
  providers/
    courier/      CourierProvider · MockEcontProvider (swap → EcontProvider, Wave 2)
    print/        PrintAdapter · BrowserPdfAdapter (now) · QzTrayAdapter (Wave 2)
  components/     ui kit, layout, shared (Timeline, DepartureCountdown), motion, controls, theme
  features/       public · auth · portal · operator  (one folder per surface)
  types/          domain.ts (hand-authored) · database.types.ts (generated — `npm run db:types`)
supabase/
  migrations/     0001_init · 0002_tables · 0003_rls · 0004_functions
  seed.sql        pricing + weekly load + guarded demo accounts/shipments/tracking
  functions/      pricing · label-render · customs-docs · econt-proxy(W2) · track-poll(W2) · notify(W2)
```

## Data & security

- **RLS on every table.** Clients touch only their own rows; staff (owner/operator/driver) touch all.
  Helper functions (`auth_role()`, `is_staff()`, `my_profile_id()`) are `SECURITY DEFINER` to avoid recursive
  policies. See `supabase/migrations/0003_rls.sql`.
- **Public tracking leaks no PII** — `/track` calls the `track_public(code)` RPC which returns status + events
  only, never names/addresses. The **OT code is an admin lookup key, not a credential**; clients authenticate
  via OTP.
- **Secrets live only in Edge Functions.** `pricing` is server-authoritative (don't trust client math);
  Storage objects are served via **signed URLs**; `audit_log` is **append-only** (RLS + triggers).

---

## Wave 2 (once credentials + customs decisions land)

1. `econt-proxy` live — `createLabel`, offices, statuses, `requestCourier`, COD (set `ECONT_*` secrets).
2. `track-poll` scheduled poller → unified two-leg timeline (Econt is pull-based, no webhooks).
3. `customs-docs` gift-relief + commercial invoice in the operator flow.
4. `QzTrayAdapter` for silent thermal printing across multiple desks.
5. Email/SMS notifications, dashboard polish, audit review, hardening.

## TODOs the owner must supply

Real **pricing rates** · company **GB EORI** · **Econt API credentials** · final services/coverage copy ·
**logo & brand colours** · confirm weekly schedule (Fri) + **booking cut-off time** (currently 14:00 / −24 h) ·
whether the **ОТ номер** has a required format (currently `HB-XXXX`).

_Known: Manchester base **542 Liverpool Road, Eccles M30 7JA** · phone **07895 909915** · weekly Friday run ·
drop-off at Mini Market Bulgaria / Българска пекарна Хубенови._

## Out of scope (per brief)

No online card gateway (payments recorded manually) · no second carrier (Econt only) · no native mobile apps.
