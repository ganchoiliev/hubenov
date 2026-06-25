/**
 * Single place to choose the courier implementation. Swap MockEcontProvider for
 * a thin client that calls the `econt-proxy` Edge Function in Wave 2 — no
 * component changes (§13).
 */
import type { CourierProvider } from './CourierProvider';
import { MockEcontProvider } from './MockEcontProvider';

let instance: CourierProvider | null = null;

export function getCourier(): CourierProvider {
  if (!instance) {
    instance = new MockEcontProvider();
  }
  return instance;
}

export type { CourierProvider } from './CourierProvider';
export type { EcontOffice, CourierLabel, CourierStatus } from './CourierProvider';
