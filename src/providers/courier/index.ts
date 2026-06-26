/**
 * Single place to choose the courier implementation. Swap MockEcontProvider for
 * a thin client that calls the `econt-proxy` Edge Function in Wave 2 — no
 * component changes (§13).
 */
import { env } from '@/lib/env';
import type { CourierProvider } from './CourierProvider';
import { MockEcontProvider } from './MockEcontProvider';
import { EcontProvider } from './EcontProvider';
import { HybridEcontProvider } from './HybridEcontProvider';

let instance: CourierProvider | null = null;

export function getCourier(): CourierProvider {
  if (!instance) {
    if (env.VITE_ECONT_ENABLED === 'true') {
      // Full live last-mile (offices + labels + COD + tracking). Needs owner's Econt account.
      instance = new EcontProvider();
    } else if (env.VITE_ECONT_OFFICES_LIVE === 'true') {
      // Live Econt offices only (read-only nomenclature); pricing/labels/COD/tracking stay mock/manual.
      instance = new HybridEcontProvider();
    } else {
      // Fully offline mock.
      instance = new MockEcontProvider();
    }
  }
  return instance;
}

export type { CourierProvider } from './CourierProvider';
export type { EcontOffice, CourierLabel, CourierStatus } from './CourierProvider';
