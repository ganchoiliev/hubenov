import { describe, it, expect } from 'vitest';
import { generateClientCode, generatePublicCode, generateAwb } from './codes';
import { transliterate, pdfSafe } from './translit';

describe('code generators', () => {
  it('client code matches HB-XXXX and avoids ambiguous chars', () => {
    const code = generateClientCode(() => 0.5);
    expect(code).toMatch(/^HB-[A-HJ-NP-Z2-9]{4}$/);
  });

  it('public code embeds year/month + zero-padded sequence', () => {
    const code = generatePublicCode(7, new Date(2026, 5, 1));
    expect(code).toBe('HB-2606-0007');
  });

  it('awb is scanner-friendly ASCII', () => {
    const awb = generateAwb(42, () => 0.1);
    expect(awb).toMatch(/^HBN000042[A-Z0-9]{4}$/);
  });
});

describe('transliteration', () => {
  it('maps Bulgarian Cyrillic to Latin', () => {
    expect(transliterate('Хубенов')).toBe('Hubenov');
    expect(transliterate('София')).toBe('Sofiya');
  });
  it('pdfSafe leaves no non-WinAnsi characters', () => {
    // eslint-disable-next-line no-control-regex
    expect(pdfSafe('Пловдив 4000')).toMatch(/^[\x20-\xff]*$/);
  });
});
