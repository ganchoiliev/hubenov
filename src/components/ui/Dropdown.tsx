/**
 * Anchored dropdown — a custom replacement for native <select>.
 *
 * Native selects on macOS reposition the popup so the *current* option sits under
 * the pointer, so the menu appears to "jump" depending on what's selected. This
 * always opens directly below its trigger (rendered in a body portal so list rows
 * never clip it), with a consistent position regardless of the selected value.
 */
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { m as motion, AnimatePresence } from 'framer-motion';

export interface DropdownOption {
  value: string;
  label: string;
}

export function Dropdown({
  value,
  onChange,
  options,
  placeholder,
  className = '',
  align = 'left',
  disabled = false,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  className?: string;
  align?: 'left' | 'right';
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxH: number;
  } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const selected = options.find((o) => o.value === value);

  // Anchor the panel to the trigger every time it opens — consistent placement.
  useLayoutEffect(() => {
    if (!open) return;
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.max(r.width, 224);
    const left = align === 'right' ? r.right - width : r.left;
    const below = window.innerHeight - r.bottom;
    const above = r.top;
    // Flip upward when the trigger sits near the bottom (e.g. the bulk action bar).
    const openUp = below < 240 && above > below;
    const maxH = Math.max(140, Math.min(288, (openUp ? above : below) - 16));
    setCoords({
      left: Math.max(8, left),
      width,
      maxH,
      ...(openUp ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
    });
  }, [open, align]);

  // Close on outside click, Esc, scroll or resize (matches native feel).
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center justify-between gap-2 rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors hover:border-brand/60 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${className}`}
      >
        <span className={`truncate ${selected ? 'text-foreground' : 'text-muted-fg'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-fg transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {createPortal(
        <AnimatePresence>
          {open && coords && (
            <motion.div
              ref={panelRef}
              role="listbox"
              id={id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                left: coords.left,
                width: coords.width,
                maxHeight: coords.maxH,
                ...(coords.top != null ? { top: coords.top } : { bottom: coords.bottom }),
              }}
              className="z-[60] overflow-auto rounded-xl border border-border bg-card p-1 shadow-lift"
            >
              {options.map((o) => {
                const on = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
                      on ? 'bg-brand-50 font-medium text-brand-700' : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <Check className={`h-4 w-4 shrink-0 text-brand ${on ? 'opacity-100' : 'opacity-0'}`} />
                    <span className="truncate">{o.label}</span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
