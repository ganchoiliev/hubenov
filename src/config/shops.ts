/**
 * UK shops we can forward from. Marketing/credibility list shown on the public
 * site and the client dashboard. Data-driven so it's trivial to extend.
 *
 * Logos: drop image files into `public/shops/` matching the `logo` path below
 * (see public/shops/README.md). If a file is missing, the grid falls back to the
 * shop NAME as text, so it never looks broken. Logos are third-party trademarks —
 * the grid shows a non-affiliation disclaimer; we are not affiliated with them.
 */
export interface Shop {
  name: string;
  /** File under /public/shops, e.g. "/shops/amazon.png". */
  logo: string;
  /** Shop site (opens in a new tab). */
  url?: string;
}

export const SHOPS: Shop[] = [
  { name: 'Amazon', logo: '/shops/amazon.png', url: 'https://www.amazon.co.uk' },
  { name: 'eBay', logo: '/shops/ebay.png', url: 'https://www.ebay.co.uk' },
  { name: 'ASOS', logo: '/shops/asos.png', url: 'https://www.asos.com' },
  { name: 'Next', logo: '/shops/next.png', url: 'https://www.next.co.uk' },
  { name: 'Argos', logo: '/shops/argos.png', url: 'https://www.argos.co.uk' },
  { name: 'IKEA', logo: '/shops/ikea.png', url: 'https://www.ikea.com/gb/en/' },
  { name: 'Decathlon', logo: '/shops/decathlon.png', url: 'https://www.decathlon.co.uk' },
  { name: 'M&S', logo: '/shops/marks-and-spencer.png', url: 'https://www.marksandspencer.com' },
  { name: 'H&M', logo: '/shops/hm.png', url: 'https://www2.hm.com/en_gb/' },
  { name: 'Zalando', logo: '/shops/zalando.png', url: 'https://www.zalando.co.uk' },
  { name: 'Boots', logo: '/shops/boots.png', url: 'https://www.boots.com' },
  { name: 'Sports Direct', logo: '/shops/sports-direct.png', url: 'https://www.sportsdirect.com' },
  { name: 'Nike', logo: '/shops/nike.png', url: 'https://www.nike.com/gb/' },
  { name: 'Adidas', logo: '/shops/adidas.png', url: 'https://www.adidas.co.uk' },
  { name: 'TK Maxx', logo: '/shops/tk-maxx.png', url: 'https://www.tkmaxx.com' },
  { name: 'Currys', logo: '/shops/currys.png', url: 'https://www.currys.co.uk' },
  { name: 'JD Sports', logo: '/shops/jd-sports.png', url: 'https://www.jdsports.co.uk' },
  { name: 'Lidl', logo: '/shops/lidl.png', url: 'https://www.lidl.co.uk' },
  { name: 'ASDA', logo: '/shops/asda.png', url: 'https://www.asda.com' },
  { name: 'Apple', logo: '/shops/apple.png', url: 'https://www.apple.com/uk/' },
];
