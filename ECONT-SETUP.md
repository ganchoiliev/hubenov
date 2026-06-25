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

## 3. Turn it on in the app
Add to `.env` (local) **and** Vercel → Settings → Environment Variables:
```
VITE_ECONT_ENABLED=true
```
Then redeploy (push) and/or restart `npm run dev`.

## What goes live
- **Real Econt offices** — the full BG office list (all cities incl. Силистра), searchable in the New Shipment receiver step. (No more mock list.)
- **Real tracking** — `getShipmentStatuses` feeds the unified timeline (polled; Econt has no webhooks).
- **createLabel** — wired, but Econt requires the **sender** to be a registered Econt client. With the demo account it returns demo labels; for production we set the owner's Econt client profile as sender. Flag this when you have the real account.

## Notes
- Leave `VITE_ECONT_ENABLED=false` until the proxy is deployed + secrets set, otherwise the office picker will error (it would try to call a missing function). With the flag off, the app uses the mock — everything keeps working.
- Customer prices always use **your** tariff (Settings → pricing), never Econt's internal cost.
