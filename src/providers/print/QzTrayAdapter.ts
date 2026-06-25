/**
 * QzTrayAdapter — silent printing to any thermal printer via QZ Tray. STUB for
 * Wave 1 (§2, §8.5 "stub now, wire later"). When wired, connect to the QZ
 * websocket, list printers, and send the PDF as raw bytes. No printer model is
 * hardcoded — QZ resolves the configured default.
 */
import type { PrintAdapter, PrintJob, PrintResult } from './PrintAdapter';

export class QzTrayAdapter implements PrintAdapter {
  readonly id = 'qz' as const;

  async isAvailable(): Promise<boolean> {
    // Wave 2: probe the QZ Tray websocket (wss://localhost:8181) here.
    return false;
  }

  async print(_job: PrintJob): Promise<PrintResult> {
    // Wave 2: qz.websocket.connect → qz.printers.getDefault →
    // qz.print(config, [{ type:'pixel', format:'pdf', data: base64 }]).
    return { ok: false, error: 'QzTrayAdapter not wired (Wave 2)' };
  }
}
