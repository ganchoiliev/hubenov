/**
 * BrowserPdfAdapter — opens the 4×6 PDF and triggers print. With Chrome
 * kiosk-printing (`--kiosk-printing`) on the operator machine this prints
 * silently to the default/thermal printer (§8.5). USE NOW.
 */
import type { PrintAdapter, PrintJob, PrintResult } from './PrintAdapter';

export class BrowserPdfAdapter implements PrintAdapter {
  readonly id = 'browser' as const;

  async isAvailable(): Promise<boolean> {
    return typeof window !== 'undefined';
  }

  async print(job: PrintJob): Promise<PrintResult> {
    if (typeof window === 'undefined') {
      return { ok: false, error: 'No window context' };
    }

    // Printing is LOCAL — the browser opens the print dialog from an in-memory
    // PDF, so it needs no network. We never gate on navigator.onLine, which is
    // unreliable and is falsely reported `false` on some machines (that bug was
    // queuing every label instead of printing it). We only fall back to the
    // queue if the local print call itself throws.
    const blob = new Blob([job.pdf as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const frame = document.createElement('iframe');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    frame.src = url;

    return new Promise<PrintResult>((resolve) => {
      frame.onload = () => {
        try {
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
          resolve({ ok: true });
        } catch (err) {
          // Genuine local print failure (rare) — keep the job as a fallback.
          queueOffline(job);
          resolve({ ok: true, queued: true, error: err instanceof Error ? err.message : 'print failed' });
        } finally {
          // Revoke after the print dialog has had time to read the blob.
          setTimeout(() => {
            URL.revokeObjectURL(url);
            frame.remove();
          }, 60_000);
        }
      };
      document.body.appendChild(frame);
    });
  }
}

const QUEUE_KEY = 'hubenov.printQueue';

function queueOffline(job: PrintJob): void {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const queue: { title: string; pdf: number[] }[] = raw ? JSON.parse(raw) : [];
    queue.push({ title: job.title, pdf: Array.from(job.pdf) });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    /* best-effort; printing will be retried on reconnect */
  }
}

export function getQueuedPrints(): { title: string; pdf: Uint8Array }[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const queue: { title: string; pdf: number[] }[] = JSON.parse(raw);
    return queue.map((q) => ({ title: q.title, pdf: Uint8Array.from(q.pdf) }));
  } catch {
    return [];
  }
}

export function clearPrintQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
}
