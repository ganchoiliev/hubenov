import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SHOPS, type Shop } from '@/config/shops';

/**
 * Grid of UK shops we forward from. Each tile opens the shop in a new tab so the
 * client can order there. Logos are grayscale and colour on hover; a missing logo
 * file falls back to the shop name (never looks broken). Shows a non-affiliation
 * disclaimer because these are third-party trademarks.
 */
export function ShopLogos({ limit, compact = false }: { limit?: number; compact?: boolean }) {
  const { i18n } = useTranslation();
  const bg = (i18n.resolvedLanguage ?? 'bg').toLowerCase().startsWith('bg');
  const shops = limit ? SHOPS.slice(0, limit) : SHOPS;

  const anyShop = bg ? 'и всеки друг UK магазин' : 'and any other UK shop';
  const disclaimer = bg
    ? 'Логата са на съответните търговски марки. Доставки Хубенов не е свързана с тях.'
    : 'Logos belong to their respective trademark owners. Hubenov Deliveries is not affiliated with them.';

  return (
    <div>
      <div
        className={cn(
          'grid items-center gap-3',
          compact ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6',
        )}
      >
        {shops.map((s) =>
          s.url ? (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              title={`${s.name} — ${bg ? 'отвори магазина' : 'open shop'}`}
              className="group relative flex h-16 items-center justify-center rounded-xl border border-border bg-card p-3 shadow-soft transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ShopLogo shop={s} />
              <ExternalLink className="absolute right-1.5 top-1.5 h-3 w-3 text-muted-fg opacity-0 transition-opacity group-hover:opacity-100" />
            </a>
          ) : (
            <div
              key={s.name}
              className="group flex h-16 items-center justify-center rounded-xl border border-border bg-card p-3 shadow-soft"
            >
              <ShopLogo shop={s} />
            </div>
          ),
        )}
      </div>
      <p className="mt-4 text-center text-sm font-semibold text-foreground">{anyShop}</p>
      <p className="mt-1.5 text-center text-xs text-muted-fg">{disclaimer}</p>
    </div>
  );
}

function ShopLogo({ shop }: { shop: Shop }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return <span className="text-center text-sm font-bold text-foreground">{shop.name}</span>;
  }
  return (
    <img
      src={shop.logo}
      alt={shop.name}
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
      className="max-h-9 w-auto max-w-[110px] object-contain opacity-80 grayscale transition group-hover:opacity-100 group-hover:grayscale-0"
    />
  );
}
