# Deploy — GitHub → Vercel → domain

The repo is committed locally and `vercel.json` handles SPA routing. `.env` is gitignored, so **no secrets are in the repo** — env vars go into Vercel.

## 1. Initialize git & push to GitHub **(you)**
I made one commit from the sandbox, but this folder blocks file deletion on my side, so git left stale lock files. Easiest is a clean re-init on your Mac (native git handles it):
```bash
cd ~/hubenov
rm -rf .git                       # clears the sandbox repo + its stale locks
git init
git add -A                        # .env is gitignored — your keys/DB password stay out
git commit -m "Доставки Хубенов — initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/hubenov.git   # create the empty repo on github.com first
git push -u origin main
```

## 2. Import to Vercel **(you)**
vercel.com → **Add New → Project** → import the `hubenov` repo.
- Framework preset: **Vite** (auto-detected). Build: `npm run build`, Output: `dist` (auto).
- **Environment Variables** (add for Production **and** Preview):
  - `VITE_SUPABASE_URL` = `https://klvbjzdhcnonsunxkakn.supabase.co`
  - `VITE_SUPABASE_ANON_KEY` = `<your anon public key>`
- **Deploy.**

## 3. Point Supabase at the live URL **(you — important)**
Supabase → **Authentication → URL Configuration**:
- **Site URL**: your Vercel URL (e.g. `https://hubenov.vercel.app`)
- **Redirect URLs**: add the Vercel URL (and later your custom domain)

Without this, OTP/email auth links won't return to your site.

## 4. Buy the domain in Vercel **(you)**
Vercel → Project → **Settings → Domains → Buy** (e.g. `hubenov.co.uk`). Vercel wires DNS automatically. Then **add that domain to the Supabase Auth URLs** from step 3.

## Notes
- Edge Functions (Econt proxy, customs, etc.) deploy separately with `supabase functions deploy` — that's Wave 2, not needed for the frontend to go live.
- Every push to `main` auto-deploys; pull requests get preview URLs.
- Never commit `.env`. To change keys in production, edit them in Vercel → Settings → Environment Variables and redeploy.
