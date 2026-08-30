/**
 * Conversion events → Vercel Analytics (custom events).
 *
 * The site's job is to turn a visit into a quote, a WhatsApp/phone tap or a
 * booking. Pageviews alone cannot tell the owner which of those happens or
 * where visitors stall, so every step fires a named event here. Values are
 * coarse (buckets, booleans, short enums) — never names, phones or messages.
 *
 * Contact taps are captured once, globally, by `useContactTapTracking` from
 * a delegated click listener: any <a> whose href is wa.me / viber: / tel: /
 * mailto: counts, on every page, without touching individual components.
 */
import { useEffect } from 'react';
import { track as vercelTrack } from '@vercel/analytics';

type Props = Record<string, string | number | boolean>;

export function track(event: string, props?: Props): void {
  try {
    vercelTrack(event, props);
  } catch {
    // analytics must never break the UI
  }
}

/** 0–5 / 5–10 / 10–20 / 20–50 / 50+ kg — enough to see what people send. */
export function weightBucket(kg: number): string {
  if (kg <= 5) return '0-5';
  if (kg <= 10) return '5-10';
  if (kg <= 20) return '10-20';
  if (kg <= 50) return '20-50';
  return '50+';
}

function channelOf(href: string): string | null {
  if (href.startsWith('https://wa.me/') || href.startsWith('https://api.whatsapp.com/')) return 'whatsapp';
  if (href.startsWith('viber:')) return 'viber';
  if (href.startsWith('tel:')) return 'phone';
  if (href.startsWith('mailto:')) return 'email';
  if (href.includes('facebook.com')) return 'facebook';
  if (href.includes('share.google') || href.includes('g.page') || href.includes('maps.app.goo.gl')) return 'google_profile';
  return null;
}

export function useContactTapTracking(): void {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a) return;
      const channel = channelOf(a.getAttribute('href') ?? '');
      if (!channel) return;
      track('contact_tap', {
        channel,
        page: window.location.pathname,
        prefilled: a.href.includes('text='),
      });
    };
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);
}
