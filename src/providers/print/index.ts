/**
 * Choose the print adapter. BrowserPdfAdapter now; switch to QzTrayAdapter when
 * scaling to silent thermal printing (§8.5) — no component changes.
 */
import { BrowserPdfAdapter } from './BrowserPdfAdapter';
import { QzTrayAdapter } from './QzTrayAdapter';
import type { PrintAdapter } from './PrintAdapter';

let instance: PrintAdapter | null = null;

export function getPrinter(): PrintAdapter {
  if (!instance) {
    // Prefer QZ when available; fall back to the browser adapter.
    instance = new BrowserPdfAdapter();
  }
  return instance;
}

export { QzTrayAdapter, BrowserPdfAdapter };
export type { PrintAdapter, PrintJob, PrintResult } from './PrintAdapter';
export { getQueuedPrints, clearPrintQueue } from './BrowserPdfAdapter';
