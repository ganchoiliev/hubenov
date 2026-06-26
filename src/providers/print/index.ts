/**
 * Choose the print adapter. BrowserPdfAdapter now; switch to QzTrayAdapter when
 * scaling to silent thermal printing (§8.5) — no component changes.
 */
import { BrowserPdfAdapter } from './BrowserPdfAdapter';
import { QzTrayAdapter } from './QzTrayAdapter';
import type { PrintAdapter } from './PrintAdapter';

let browserInstance: PrintAdapter | null = null;
let qzInstance: PrintAdapter | null = null;

/** Pick the adapter by the operator's configured print method (company settings). */
export function getPrinter(method: 'browser' | 'qz' = 'browser'): PrintAdapter {
  if (method === 'qz') {
    qzInstance ??= new QzTrayAdapter();
    return qzInstance;
  }
  browserInstance ??= new BrowserPdfAdapter();
  return browserInstance;
}

export { QzTrayAdapter, BrowserPdfAdapter };
export type { PrintAdapter, PrintJob, PrintResult } from './PrintAdapter';
export { getQueuedPrints, clearPrintQueue } from './BrowserPdfAdapter';
