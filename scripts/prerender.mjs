/**
 * Dev-time: capture rendered snapshots of the public routes.
 *
 *   npm run prerender
 *
 * Builds the app, serves `dist` with `vite preview`, opens every public
 * route in headless Chromium, waits for the page to settle, and stores the
 * rendered `#root` markup plus title / description / page-level JSON-LD in
 * `prerender/snapshots/<slug>.json`. Commit those files. `npm run build`
 * (locally and on Vercel) then injects them via scripts/inject-prerender.mjs.
 *
 * Routes come from public/sitemap.xml so the two never drift.
 *
 * Requires Playwright's Chromium once: `npx playwright install chromium`.
 */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4173;
const BASE = `http://localhost:${PORT}`;

const sitemap = readFileSync(join(root, 'public', 'sitemap.xml'), 'utf8');
const routes = [...sitemap.matchAll(/<loc>https:\/\/hubenov\.delivery(\/[^<]*)<\/loc>/g)].map((m) => m[1]);
if (!routes.includes('/rules')) routes.push('/rules');

const run = (cmd, args) =>
  new Promise((res, rej) => {
    const p = spawn(cmd, args, { cwd: root, stdio: 'inherit', shell: true });
    p.on('exit', (c) => (c === 0 ? res() : rej(new Error(`${cmd} exited ${c}`))));
  });

// A plain build (no injection) so snapshots come from the live app, not
// from a previous snapshot.
await run('npx', ['vite', 'build']);

const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  cwd: root,
  shell: true,
  stdio: 'ignore',
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 40; i++) {
  try {
    await fetch(BASE);
    break;
  } catch {
    await wait(250);
  }
}

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'bg-BG' });
const page = await ctx.newPage();
await page.addInitScript(() => {
  // Deterministic snapshot: Bulgarian, light theme, no persisted state.
  try {
    localStorage.clear();
    localStorage.setItem('hubenov.locale', 'bg');
    localStorage.removeItem('hubenov.theme.v3');
  } catch {}
});

mkdirSync(join(root, 'prerender', 'snapshots'), { recursive: true });
for (const route of routes) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
  // Let mount animations finish so captured inline styles are the resting state.
  await wait(1200);
  const snap = await page.evaluate(() => {
    const root = document.getElementById('root');
    // Page-level JSON-LD (e.g. FAQPage) stays inside #root: React replaces
    // the whole subtree on mount, so crawlers see one copy and users' DOM
    // gets exactly one copy — nothing duplicated into <head>.
    root.querySelectorAll('video, iframe, script:not([type="application/ld+json"])').forEach((el) => el.remove());
    const jsonLd = [];
    const desc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    return {
      title: document.title,
      description: desc,
      lang: document.documentElement.lang || 'bg',
      html: root.innerHTML,
      jsonLd,
    };
  });
  const slug = route === '/' ? 'index' : route.replace(/^\//, '').replace(/\//g, '__');
  writeFileSync(join(root, 'prerender', 'snapshots', `${slug}.json`), JSON.stringify({ route, ...snap }, null, 0));
  console.log(`[prerender] ${route} — ${snap.title} (${(snap.html.length / 1024).toFixed(0)} KB)`);
}

await browser.close();
preview.kill();
await run('node', ['scripts/inject-prerender.mjs']);
process.exit(0);
