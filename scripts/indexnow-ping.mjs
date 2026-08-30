// Pings IndexNow (Bing, Yandex, Seznam, Naver share the endpoint) with
// every URL in the live sitemap. Runs post-deploy; no-ops outside
// production so preview builds never ping.
const KEY = 'dff49a774e1e42ed479df1a337e86854';
const HOST = 'hubenov.delivery';

if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
  console.log('[indexnow] non-production build, skipping ping');
  process.exit(0);
}

const res = await fetch(`https://${HOST}/sitemap.xml`);
const xml = await res.text();
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (urls.length === 0) {
  console.error('[indexnow] sitemap yielded no URLs, aborting');
  process.exit(1);
}

const ping = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: `https://${HOST}/${KEY}.txt`,
    urlList: urls,
  }),
});
console.log(`[indexnow] submitted ${urls.length} URLs — HTTP ${ping.status}`);
