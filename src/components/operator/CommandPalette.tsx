/**
 * Operator command palette (⌘K). Type to jump to any parcel, client, or invoice.
 * Debounced server search across all three; full keyboard nav.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, m as motion } from 'framer-motion';
import { Search, Package, User, Receipt, CornerDownLeft } from 'lucide-react';
import { Spinner } from '@/components/ui';
import { useGlobalSearch, type SearchHit } from '@/lib/queries';
import { cn } from '@/lib/utils';

const ICON = { parcel: Package, client: User, invoice: Receipt } as const;

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const L =
    lang === 'bg'
      ? {
          placeholder: 'Търси пратка, клиент или фактура…',
          empty: 'Няма резултати',
          hint: 'за начало напишете поне 2 символа',
          go: 'отвори',
          nav: 'навигация',
          kinds: { parcel: 'Пратка', client: 'Клиент', invoice: 'Фактура' },
        }
      : {
          placeholder: 'Search parcel, client or invoice…',
          empty: 'No results',
          hint: 'type at least 2 characters',
          go: 'open',
          nav: 'navigate',
          kinds: { parcel: 'Parcel', client: 'Client', invoice: 'Invoice' },
        };

  useEffect(() => {
    const id = setTimeout(() => setDebounced(term), 180);
    return () => clearTimeout(id);
  }, [term]);

  const { data: hits, isFetching } = useGlobalSearch(open ? debounced : '');
  const results = useMemo(() => hits ?? [], [hits]);

  // Reset + focus on open.
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
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.98, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8 }}
            transition={{ duration: 0.14 }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-lift"
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="h-4.5 w-4.5 shrink-0 text-muted-fg" />
              <input
                ref={inputRef}
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={onKey}
                placeholder={L.placeholder}
                className="h-12 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-fg"
              />
              {isFetching && <Spinner className="h-4 w-4" />}
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-2">
              {debounced.trim().length < 2 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-fg">{L.hint}</p>
              ) : results.length === 0 && !isFetching ? (
                <p className="px-3 py-6 text-center text-sm text-muted-fg">{L.empty}</p>
              ) : (
                results.map((h, i) => {
                  const Icon = ICON[h.kind];
                  return (
                    <button
                      key={`${h.kind}-${h.id}`}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => choose(h)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                        i === active ? 'bg-muted' : 'hover:bg-muted/60',
                      )}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{h.label}</span>
                        {h.sub && <span className="block truncate text-xs text-muted-fg">{h.sub}</span>}
                      </span>
                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-fg">
                        {L.kinds[h.kind]}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border px-4 py-2 text-[11px] text-muted-fg">
              <span className="flex items-center gap-1">
                <CornerDownLeft className="h-3 w-3" /> {L.go}
              </span>
              <span>↑↓ {L.nav}</span>
              <span>Esc</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
