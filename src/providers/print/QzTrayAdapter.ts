/**
 * QzTrayAdapter — silent printing to any (thermal) printer via QZ Tray, the
 * small desktop app that exposes a localhost websocket. The qz-tray client is
 * lazy-loaded from CDN only when this adapter is used.
 *
 * Unsigned mode: no certificate/signature is sent, so the QZ Tray app shows a
 * one-time "Allow" prompt (tick "remember"). For production hardening you can
 * later add a signed certificate (qz.security.set*Promise → a backend signer).
 *
 * Requires the QZ Tray desktop app installed + running (https://qz.io/download).
 */
import type { PrintAdapter, PrintJob, PrintResult } from './PrintAdapter';

interface QzApi {
  websocket: { isActive(): boolean; connect(opts?: unknown): Promise<void> };
  printers: { getDefault(): Promise<string> };
  configs: { create(printer: string, opts?: unknown): unknown };
  print(config: unknown, data: unknown[]): Promise<void>;
  security: {
    setCertificatePromise(fn: (resolve: (v?: unknown) => void, reject: (e?: unknown) => void) => void): void;
    setSignaturePromise(
      fn: (toSign: string) => (resolve: (v?: unknown) => void, reject: (e?: unknown) => void) => void,
    ): void;
  };
}

const QZ_CDN = 'https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js';
let qzPromise: Promise<QzApi> | null = null;
let securitySet = false;

function loadQz(): Promise<QzApi> {
  if (qzPromise) return qzPromise;
  qzPromise = new Promise<QzApi>((resolve, reject) => {
    const w = window as unknown as { qz?: QzApi };
    if (w.qz) return resolve(w.qz);
    const script = document.createElement('script');
    script.src = QZ_CDN;
    script.async = true;
    script.onload = () => (w.qz ? resolve(w.qz) : reject(new Error('qz-tray failed to initialise')));
    script.onerror = () => reject(new Error('qz-tray script failed to load'));
    document.head.appendChild(script);
  });
  return qzPromise;
}

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(bin);
}

export class QzTrayAdapter implements PrintAdapter {
  readonly id = 'qz' as const;

  async isAvailable(): Promise<boolean> {
    try {
      const qz = await loadQz();
      await this.connect(qz);
      return qz.websocket.isActive();
    } catch {
      return false;
    }
  }

  private async connect(qz: QzApi): Promise<void> {
    if (!securitySet) {
      // Unsigned — QZ Tray shows an Allow prompt (one-time, rememberable).
      qz.security.setCertificatePromise((resolve) => resolve());
      qz.security.setSignaturePromise(() => (resolve) => resolve());
      securitySet = true;
    }
    if (!qz.websocket.isActive()) await qz.websocket.connect();
  }

  async print(job: PrintJob): Promise<PrintResult> {
    try {
      const qz = await loadQz();
      await this.connect(qz);
      const printer = await qz.printers.getDefault();
      const config = qz.configs.create(printer);
      await qz.print(config, [{ type: 'pixel', format: 'pdf', flavor: 'base64', data: toBase64(job.pdf) }]);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'QZ Tray print failed' };
    }
  }
}
