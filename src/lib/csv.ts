/**
 * Tiny CSV builder + browser download. UTF-8 BOM so Excel renders Cyrillic, and
 * RFC-4180 escaping (quotes doubled, fields with separators quoted).
 */
export interface CsvColumn<T> {
  label: string;
  get: (row: T) => unknown;
}

function cell(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildCsv<T>(rows: T[], cols: CsvColumn<T>[]): string {
  const head = cols.map((c) => cell(c.label)).join(',');
  const body = rows.map((r) => cols.map((c) => cell(c.get(r))).join(',')).join('\r\n');
  return `${head}\r\n${body}`;
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
