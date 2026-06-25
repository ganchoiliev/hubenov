import { describe, it, expect } from 'vitest';
import { assessCustoms, totalValue, GIFT_RELIEF_CEILING_GBP } from './customs';
import type { CustomsItem } from '@/types/domain';

const items: CustomsItem[] = [
  { description: 'Chocolate', qty: 2, unit_value: 5 },
  { description: 'T-shirt', qty: 1, unit_value: 10 },
];

describe('totalValue', () => {
  it('sums qty * unit_value', () => {
    expect(totalValue(items)).toBe(20);
  });
});

describe('assessCustoms', () => {
  it('applies gift relief under the ceiling', () => {
    const a = assessCustoms(items, true, 'GBP');
    expect(a.gift_relief_applied).toBe(true);
    expect(a.requires_eori).toBe(false);
    expect(a.requires_hs_codes).toBe(false);
    expect(a.warnings).toHaveLength(0);
  });

  it('treats an over-ceiling gift as commercial', () => {
    const big: CustomsItem[] = [{ description: 'Phone', qty: 1, unit_value: GIFT_RELIEF_CEILING_GBP + 50 }];
    const a = assessCustoms(big, true, 'GBP', null);
    expect(a.gift_relief_applied).toBe(false);
    expect(a.requires_eori).toBe(true);
    expect(a.warnings).toContain('Gift above relief ceiling — treated as commercial');
    expect(a.warnings).toContain('EORI required for commercial consignment');
  });

  it('flags missing HS codes on commercial goods', () => {
    const a = assessCustoms(items, false, 'GBP', 'GB123456789000');
    expect(a.requires_hs_codes).toBe(true);
    expect(a.warnings).toContain('HS code missing on one or more commercial items');
  });
});
