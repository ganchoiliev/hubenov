/**
 * The Manchester hub address clients ship their online orders to. Single physical
 * location for now; can move to company_settings later if the owner relocates.
 *
 * The reliable-receiving model: the client puts their OT code (HB-XXXX) in the
 * recipient name at Amazon/eBay checkout, so the box arrives physically labelled
 * with an identifier we always know — independent of the carrier's barcode.
 */
export const HUB_ADDRESS = {
  careOf: 'Доставки Хубенов / Hubenov Deliveries',
  line1: '542 Liverpool Road',
  line2: 'Eccles',
  city: 'Manchester',
  postcode: 'M30 7JA',
  country: 'United Kingdom',
} as const;

/** The recipient-name line a client should use at checkout: "Name (HB-XXXX)". */
export function hubRecipientName(fullName: string, clientCode: string): string {
  const name = fullName.trim();
  return name ? `${name} (${clientCode})` : clientCode;
}

/** One-line-per-row address block for copy/paste, with the client's code on top. */
export function hubAddressLines(fullName: string, clientCode: string): string[] {
  return [
    hubRecipientName(fullName, clientCode),
    `c/o ${HUB_ADDRESS.careOf}`,
    HUB_ADDRESS.line1,
    HUB_ADDRESS.line2,
    `${HUB_ADDRESS.city} ${HUB_ADDRESS.postcode}`,
    HUB_ADDRESS.country,
  ];
}
