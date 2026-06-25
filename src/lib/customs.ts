/**
 * Customs core (§5 customs-docs, §10). Gift relief vs commercial validation.
 * Pure logic so it is unit-testable and shared with the Edge Function.
 *
 * NOTE: thresholds here are conservative placeholders. TODO(owner/Wave 2):
 * confirm current UK/BG/EU gift-relief thresholds and commercial requirements
 * with a customs adviser; values change and carry legal weight.
 */
import type { CustomsItem, Currency } from '@/types/domain';

/** Indicative consumer gift-relief ceiling (per consignment). */
export const GIFT_RELIEF_CEILING_GBP = 39;

export interface CustomsAssessment {
  total_value: number;
  currency: Currency;
  is_gift: boolean;
  gift_relief_applied: boolean;
  requires_eori: boolean;
  requires_hs_codes: boolean;
  warnings: string[];
}

export function totalValue(items: CustomsItem[]): number {
  return round2(items.reduce((s, i) => s + i.qty * i.unit_value, 0));
}

export function assessCustoms(
  items: CustomsItem[],
  isGift: boolean,
  currency: Currency,
  eori?: string | null,
): CustomsAssessment {
  const total = totalValue(items);
  const warnings: string[] = [];

  const giftReliefApplied = isGift && total <= GIFT_RELIEF_CEILING_GBP;
  // Commercial (non-gift, or gift above the relief ceiling) needs EORI + HS.
  const isCommercial = !giftReliefApplied;

  const requiresEori = isCommercial;
  const requiresHs = isCommercial;

  if (requiresEori && !eori) {
    warnings.push('EORI required for commercial consignment');
  }
  if (requiresHs && items.some((i) => !i.hs_code)) {
    warnings.push('HS code missing on one or more commercial items');
  }
  if (isGift && total > GIFT_RELIEF_CEILING_GBP) {
    warnings.push('Gift above relief ceiling — treated as commercial');
  }

  return {
    total_value: total,
    currency,
    is_gift: isGift,
    gift_relief_applied: giftReliefApplied,
    requires_eori: requiresEori,
    requires_hs_codes: requiresHs,
    warnings,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
