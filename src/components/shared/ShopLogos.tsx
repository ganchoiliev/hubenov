import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SHOPS, type Shop } from '@/config/shops';

/**
 * Grid of UK shops we forward from. Each tile opens the shop in a new tab so the
 * client can order there. We don't ship brand logos (trademarks): each shop is a
 * styled wordmark with its brand-colour accent. If a `logo` file is provided it is
 * shown instead. A non-affiliation disclaimer sits below.
 */
export function ShopLogos({ limit, compact = false }: { limit?: number; compact?: boolean }) {
  const { i18n } = useTranslation();
  const bg = (i18n.resolvedLanguage ?? 'bg').toLowerCase().startsWith('bg');
  const shops = limit ? SHOPS.slice(0, limit) : SHOPS;

  const anyShop = bg ? 'и всеки друг UK магазин' : 'and any other UK shop';
  const disclaimer = bg
    ? 'Имената и марките са на съответните им собственици. Доставки Хубенов не е свързана с тях.'
    : 'Names and brands belong to their respective owners. Hubenov Deliveries is not affiliated with them.';

  return (
    <div>
      <div
        className={cn(
          'grid gap-3',
          compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5',
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
              className="group relative flex h-[4.75rem] items-center justify-center rounded-2xl border border-border bg-card px-3 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ShopTile shop={s} />
              <ExternalLink className="absolute right-2 top-2 h-3 w-3 text-muted-fg opacity-0 transition-opacity group-hover:opacity-100" />
            </a>
          ) : (
            <div
              key={s.name}
              className="group flex h-[4.75rem] items-center justify-center rounded-2xl border border-border bg-card px-3 shadow-soft"
            >
              <ShopTile shop={s} />
            </div>
          ),
        )}
      </div>
      <p className="mt-5 text-center text-sm font-semibold text-foreground">{anyShop}</p>
      <p className="mt-1.5 text-center text-xs text-muted-fg">{disclaimer}</p>
    </div>
  );
}

function ShopTile({ shop }: { shop: Shop }) {
  const [broken, setBroken] = useState(false);

  // Official logo, if one was dropped in /public/shops.
  if (shop.logo && !broken) {
    return (
      <img
        src={shop.logo}
        alt={shop.name}
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
        className="max-h-9 w-auto max-w-[120px] object-contain opacity-80 grayscale transition group-hover:opacity-100 group-hover:grayscale-0"
      />
    );
  }

  // Branded wordmark: readable name + a brand-colour accent bar that grows on hover.
  return (
    <span className="flex flex-col items-center">
      <span className="font-display text-[0.95rem] font-extrabold tracking-tight text-foreground">{shop.name}</span>
      <span
        aria-hidden
        className="mt-2 h-[3px] w-7 rounded-full opacity-80 transition-all duration-300 group-hover:w-14 group-hover:opacity-100"
        style={{ backgroundColor: shop.color }}
      />
    </span>
  );
}
