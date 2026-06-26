# Econt API — turn on live offices, labels & tracking

You do **not** need to log into `delivery.econt.com` (that's their e-commerce plugin
portal — wrong product, and its OAuth is glitchy). Our app calls Econt's JSON API
through the `econt-proxy` Edge Function, which keeps the credentials server-side.

## 1. Deploy the proxy  (Supabase CLI — no install needed, via `npx`)
```bash
cd ~/hubenov
npx supabase login                                   # opens browser once
npx supabase link --project-ref klvbjzdhcnonsunxkakn
npx supabase functions deploy econt-proxy
```

## 2. Set the Econt credentials (DEMO — for building/testing now)
```bash
npx supabase secrets set \
  ECONT_USERNAME=iasp-dev \
  ECONT_PASSWORD=1Asp-dev \
  ECONT_BASE_URL=https://demo.econt.com/ee/services
```
For **production** later, swap to the owner's Econt **client** account and
`ECONT_BASE_URL=https://ee.econt.com/services`.

## 3. Turn it on in the app — TWO modes

The office nomenclature (read-only reference data) and the transactional methods
(label / COD / tracking) have different account requirements, so they're on
separate flags. Set these in `.env` (local) **and** Vercel → Settings → Environment
Variables, then redeploy / restart `npm run dev`.

### Mode A — Offices only  ✅ recommended for launch (no owner Econt account needed)
```
VITE_ECONT_OFFICES_LIVE=true
VITE_ECONT_ENABLED=false
```
- **Real Econt offices** go live in the picker — the full national list, all cities
  incl. Силистра, searchable in Cyrillic + Latin. Works on the **demo** credentials
  because the office nomenclature is public reference data.
- Pricing, labels, COD and tracking stay on the **mock / manual** path (the operator
  records the Econt tracking № + COD by hand in the shipment panel — same as today).
- If the proxy is briefly unreachable, the picker falls back to the built-in list, so
  it never errors.

### Mode B — Full last-mile  (needs the owner's Econt BUSINESS account)
```
VITE_ECONT_ENABLED=true
```
- Adds automatic **createLabel**, **requestCourier** and **real tracking** on top of
  offices. Econt requires the **sender** to be a registered Econt client (the owner's
  CD number) — until that exists, these run against the **demo** sandbox and return
  fake labels / demo data. Only flip this once the owner's real account is set and
  `ECONT_BASE_URL=https://ee.econt.com/services`.

## Notes
- With **both** flags `false`, the app uses the fully offline mock — everything keeps working.
- Demo nomenclature contains junk placeholder entries (e.g. an office literally named
  `testtest`). Those disappear when you point at the owner's **production** account.
- Customer prices always use **your** tariff (Settings → pricing), never Econt's internal cost.
- Hardening TODO for Mode B: the `econt-proxy` currently only checks that a request is
  authenticated. Before going live on money operations, gate `createLabel` /
  `requestCourier` to staff roles (mirror the `send-email` function's JWT→role check).
