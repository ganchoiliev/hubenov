/**
 * Operator command palette (⌘K). Type to jump to any parcel, client, or invoice.
 * Debounced server search across all three; full keyboard nav.
 */
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, m as motion } from 'framer-motion';
import { Search, Package, User, Receipt, CornerDownLeft } from 'lucide-react';
import { Spinner } from '@/components/ui';
import { useGlobalSearch, type SearchHit } from '@/lib/queries';
import { cn } from '@/lib/utils';

const KIND = {
  parcel: { Icon: Package, tile: 'bg-brand-50 text-brand-700' },
  client: { Icon: User, tile: 'bg-sky-50 text-sky-600' },
  invoice: { Icon: Receipt, tile: 'bg-amber-50 text-amber-600' },
} as const;

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-border bg-card px-1 font-mono text-[10px] font-medium text-muted-fg">
    {children}
  </kbd>
);

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  const L =
    lang === 'bg'
      ? {
          placeholder: 'Търси пратка, клиент или фактура…',
          empty: 'Няма резултати',
          hint: 'Напишете поне 2 символа',
          go: 'отвори',
          nav: 'навигация',
          kinds: { parcel: 'Пратки', client: 'Клиенти', invoice: 'Фактури' },
        }
      : {
          placeholder: 'Search parcel, client or invoice…',
          empty: 'No results',
          hint: 'Type at least 2 characters',
          go: 'open',
          nav: 'navigate',
          kinds: { parcel: 'Parcels', client: 'Clients', invoice: 'Invoices' },
        };

  useEffect(() => {
    const id = setTimeout(() => setDebounced(term), 180);
    return () => clearTimeout(id);
  }, [term]);

  const { data: hits, isFetching } = useGlobalSearch(open ? debounced : '');
  const results = useMemo(() => hits ?? [], [hits]);

  useEffect(() => {
    if (open) {
      setTerm('');
      setDebounced('');
      setActive(0);
      const id = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(id);
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [results.length]);

  // Keep the highlighted row in view as you arrow through.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (h: SearchHit) => {
    navigate(h.to);
    onClose();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const h = results[active];
      if (h) choose(h);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const ready = debounced.trim().length >= 2;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[130] flex items-start justify-center p-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.97, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -10 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl ring-1 ring-black/5"
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="h-5 w-5 shrink-0 text-muted-fg" />
              <input
                ref={inputRef}
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={onKey}
                placeholder={L.placeholder}
                className="h-14 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-fg"
              />
              {isFetching && <Spinner className="h-4 w-4" />}
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-2">
              {!ready ? (
                <div className="flex flex-col items-center gap-2 px-3 py-10 text-center">
                  <Search className="h-6 w-6 text-muted-fg/50" />
                  <p className="text-sm text-muted-fg">{L.hint}</p>
                </div>
              ) : results.length === 0 && !isFetching ? (
                <p className="px-3 py-10 text-center text-sm text-muted-fg">{L.empty}</p>
              ) : (
                results.map((h, i) => {
                  const prev = results[i - 1];
                  const showHeader = !prev || prev.kind !== h.kind;
                  const { Icon, tile } = KIND[h.kind];
                  return (
                    <Fragment key={`${h.kind}-${h.id}`}>
                      {showHeader && (
                        <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-fg first:pt-1">
                          {L.kinds[h.kind]}
                        </p>
                      )}
                      <button
                        ref={i === active ? activeRef : undefined}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => choose(h)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                          i === active ? 'bg-muted' : 'hover:bg-muted/50',
                        )}
                      >
                        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', tile)}>
                          <Icon className="h-4.5 w-4.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-foreground">{h.label}</span>
                          {h.sub && <span className="block truncate text-xs text-muted-fg">{h.sub}</span>}
                        </span>
                        {i === active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-fg" />}
                      </button>
                    </Fragment>
                  );
                })
              )}
            </div>

            <div className="flex items-center gap-4 border-t border-border bg-muted/30 px-4 py-2.5 text-[11px] text-muted-fg">
              <span className="flex items-center gap-1.5">
                <Kbd>↵</Kbd> {L.go}
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> {L.nav}
              </span>
              <span className="ml-auto flex items-center gap-1.5">
                <Kbd>Esc</Kbd>
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
