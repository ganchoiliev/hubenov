/**
 * Build step: turn the SPA shell into per-route static HTML.
 *
 * Reads `prerender/snapshots/*.json` (captured by `npm run prerender`) and
 * writes `dist/<route>/index.html` for every public route: the built
 * `dist/index.html` with the route's <title>, meta description, canonical,
 * Open Graph tags and any page-level JSON-LD swapped in, and `#root`
 * pre-filled with the rendered markup.
 *
 * Why: crawlers and AI engines (GPTBot, bingbot, ClaudeBot, PerplexityBot)
 * do not execute JavaScript. Before this step every URL on the site served
 * the same 7 KB shell with an empty body — invisible to them. Vercel serves
 * files from the filesystem before applying the SPA rewrite, so these
 * static pages win for the public routes while /portal, /op and /login
 * stay client-only.
 *
 * The client still boots normally: main.tsx renders into #root and replaces
 * the snapshot with the live app. A stale snapshot therefore only affects
 * what crawlers read, never what users see — but keep it fresh: run
 * `npm run prerender` after changing public-page copy.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const snapDir = join(root, 'prerender', 'snapshots');
const SITE = 'https://hubenov.delivery';

const shellPath = join(dist, 'index.html');
if (!existsSync(shellPath)) {
  console.error('[prerender] dist/index.html missing — run vite build first');
  process.exit(1);
}
if (!existsSync(snapDir)) {
  console.warn('[prerender] no snapshots found — skipping (site stays SPA-only)');
  process.exit(0);
}

const shell = readFileSync(shellPath, 'utf8');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

let n = 0;
for (const file of readdirSync(snapDir).filter((f) => f.endsWith('.json'))) {
  const snap = JSON.parse(readFileSync(join(snapDir, file), 'utf8'));
  const { route, title, description, lang, html, jsonLd } = snap;
  const url = `${SITE}${route === '/' ? '/' : route}`;

  let out = shell;
  out = out.replace(/<html lang="[^"]*"/, `<html lang="${lang || 'bg'}"`);
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  if (description) {
    out = out.replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/>/s,
      `<meta name="description" content="${esc(description)}" />`,
    );
    out = out.replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${esc(description)}" />`);
    out = out.replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${esc(description)}" />`);
  }
  out = out.replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${esc(title)}" />`);
  out = out.replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${esc(title)}" />`);
  out = out.replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${url}" />`);

  const extraHead = [`<link rel="canonical" href="${url}" />`];
  for (const ld of jsonLd || []) extraHead.push(`<script type="application/ld+json">${ld}</script>`);
  out = out.replace('</head>', `    ${extraHead.join('\n    ')}\n  </head>`);

  out = out.replace('<div id="root"></div>', `<div id="root">${html}</div>`);

  // dist/faq.html — served for /faq by Vercel's `cleanUrls: true` (vercel.json),
  // which also 308s /faq/ → /faq so there is exactly one canonical URL.
  const target = route === '/' ? shellPath : join(dist, `${route.replace(/^\//, '')}.html`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, out);
  n++;
}
console.log(`[prerender] wrote ${n} static route(s)`);
