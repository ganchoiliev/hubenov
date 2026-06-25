/**
 * PrintAdapter — printer-agnostic label printing (§2, §8). The app only ever
 * sees this interface. BrowserPdfAdapter works now (Chrome kiosk-printing);
 * QzTrayAdapter (silent thermal) wires later. No printer model in app code.
 */
export interface PrintJob {
  /** 4×6" label as PDF bytes. */
  pdf: Uint8Array;
  /** Human-friendly job name (shipment/public code). */
  title: string;
}

export interface PrintResult {
  ok: boolean;
  /** True if the job was queued offline for later sync (§8.7). */
  queued?: boolean;
  error?: string;
}

export interface PrintAdapter {
  readonly id: 'browser' | 'qz';
  isAvailable(): Promise<boolean>;
  print(job: PrintJob): Promise<PrintResult>;
}
