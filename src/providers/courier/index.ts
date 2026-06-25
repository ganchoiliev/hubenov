/**
 * Single place to choose the courier implementation. Swap MockEcontProvider for
 * a thin client that calls the `econt-proxy` Edge Function in Wave 2 — no
 * component changes (§13).
 */
import { env } from '@/lib/env';
import type { CourierProvider } from './CourierProvider';
import { MockEcontProvider } from './MockEcontProvider';
import { EcontProvider } from './EcontProvider';

let instance: CourierProvider | null = null;

export function getCourier(): CourierProvider {
  if (!instance) {
    // Real Econt once the proxy is deployed + VITE_ECONT_ENABLED=true; mock otherwise.
    instance = env.VITE_ECONT_ENABLED === 'true' ? new EcontProvider() : new MockEcontProvider();
  }
  return instance;
}

export type { CourierProvider } from './CourierProvider';
export type { EcontOffice, CourierLabel, CourierStatus } from './CourierProvider';
