/**
 * UK shops we can forward from. Shown on the public site + client dashboard.
 *
 * We don't ship third-party brand logos (trademarks). Each shop renders as a
 * styled wordmark with its brand accent colour. If you later obtain an official
 * logo, drop the file in `public/shops/` and set `logo` below — the grid shows the
 * image instead of the wordmark, with no other change. The grid always shows a
 * non-affiliation disclaimer.
 */
export interface Shop {
  name: string;
  /** Brand accent colour (decorative underline / accent only). */
  color: string;
  /** Shop site — opens in a new tab. */
  url?: string;
  /** Optional official logo under /public/shops (e.g. "/shops/amazon.png"). */
  logo?: string;
}

export const SHOPS: Shop[] = [
  { name: 'Amazon', color: '#FF9900', url: 'https://www.amazon.co.uk' },
  { name: 'eBay', color: '#E53238', url: 'https://www.ebay.co.uk' },
  { name: 'ASOS', color: '#2D2D2D', url: 'https://www.asos.com' },
  { name: 'Next', color: '#1A1A1A', url: 'https://www.next.co.uk' },
  { name: 'Argos', color: '#ED1B24', url: 'https://www.argos.co.uk' },
  { name: 'IKEA', color: '#0058A3', url: 'https://www.ikea.com/gb/en/' },
  { name: 'Decathlon', color: '#0082C3', url: 'https://www.decathlon.co.uk' },
  { name: 'M&S', color: '#00543C', url: 'https://www.marksandspencer.com' },
  { name: 'H&M', color: '#E50010', url: 'https://www2.hm.com/en_gb/' },
  { name: 'Zalando', color: '#FF6900', url: 'https://www.zalando.co.uk' },
  { name: 'Boots', color: '#05054B', url: 'https://www.boots.com' },
  { name: 'Sports Direct', color: '#E4002B', url: 'https://www.sportsdirect.com' },
  { name: 'Nike', color: '#111111', url: 'https://www.nike.com/gb/' },
  { name: 'Adidas', color: '#111111', url: 'https://www.adidas.co.uk' },
  { name: 'TK Maxx', color: '#E4002B', url: 'https://www.tkmaxx.com' },
  { name: 'Currys', color: '#4C2C92', url: 'https://www.currys.co.uk' },
  { name: 'JD Sports', color: '#111111', url: 'https://www.jdsports.co.uk' },
  { name: 'Lidl', color: '#0050AA', url: 'https://www.lidl.co.uk' },
  { name: 'ASDA', color: '#78BE20', url: 'https://www.asda.com' },
  { name: 'Apple', color: '#333333', url: 'https://www.apple.com/uk/' },
];
