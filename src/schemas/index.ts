/**
 * Zod schemas — validation on EVERY input, client and Edge Function (B.L.A.S.T.
 * — Secure). Edge Functions import equivalent schemas; never trust client math.
 */
import { z } from 'zod';

export const directionSchema = z.enum(['UK_BG', 'BG_UK']);
export const currencySchema = z.enum(['GBP', 'EUR', 'BGN']);
export const countrySchema = z.enum(['GB', 'BG']);
export const parcelTypeSchema = z.enum(['parcel', 'document', 'pallet', 'food', 'other']);
export const localeSchema = z.enum(['bg', 'en']);
export const paymentMethodSchema = z.enum(['cash', 'bank_transfer', 'card_office', 'cod']);

export const quoteInputSchema = z.object({
  direction: directionSchema,
  weight_kg: z.number().positive().max(1000),
  length_cm: z.number().positive().max(300).default(30),
  width_cm: z.number().positive().max(300).default(30),
  height_cm: z.number().positive().max(300).default(30),
  is_gift: z.boolean().default(false),
  declared_value: z.number().nonnegative().default(0),
  currency: currencySchema.default('GBP'),
  remote_area: z.boolean().default(false),
});
export type QuoteInput = z.infer<typeof quoteInputSchema>;

export const partySchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(6),
  line1: z.string().min(2),
  line2: z.string().optional().nullable(),
  city: z.string().min(2),
  postcode: z.string().min(2),
  country: countrySchema,
  econt_office_code: z.string().optional().nullable(),
});

export const shipmentInputSchema = z.object({
  direction: directionSchema,
  parcel_type: parcelTypeSchema.default('parcel'),
  sender: partySchema,
  receiver: partySchema,
  weight_kg: z.number().positive().max(1000),
  length_cm: z.number().positive().max(300),
  width_cm: z.number().positive().max(300),
  height_cm: z.number().positive().max(300),
  declared_value: z.number().nonnegative(),
  // What we charge the customer (delivery fee) — flows to the invoice. Distinct
  // from declared_value (goods value for customs). Optional at intake.
  price: z.preprocess(
    (v) => (v === '' || v === null || (typeof v === 'number' && Number.isNaN(v)) ? undefined : v),
    z.number().nonnegative().optional(),
  ),
  currency: currencySchema.default('GBP'),
  is_gift: z.boolean().default(false),
  notes: z.string().max(2000).optional().nullable(),
});
export type ShipmentInput = z.infer<typeof shipmentInputSchema>;

/** Phone-OTP login. Diaspora users may not use email (§7). */
export const phoneLoginSchema = z.object({
  phone: z
    .string()
    .min(8)
    .regex(/^\+?[0-9 ()-]{8,20}$/, 'Invalid phone number'),
});

export const otpVerifySchema = z.object({
  phone: z.string().min(8),
  token: z.string().length(6, '6 digits'),
});

/** Public track-by-number — status only, never PII (§10). */
export const trackInputSchema = z.object({
  code: z.string().min(3).max(40),
});

export const customsItemSchema = z.object({
  description: z.string().min(1),
  hs_code: z.string().optional(),
  qty: z.number().int().positive(),
  unit_value: z.number().nonnegative(),
});

export const customsInputSchema = z.object({
  shipment_id: z.string().uuid(),
  is_gift: z.boolean(),
  eori: z.string().optional().nullable(),
  invoice_no: z.string().optional().nullable(),
  items: z.array(customsItemSchema).min(1),
  currency: currencySchema.default('GBP'),
});
export type CustomsInput = z.infer<typeof customsInputSchema>;

export const recordPaymentSchema = z.object({
  invoice_id: z.string().uuid(),
  method: paymentMethodSchema,
  amount: z.number().positive(),
});

/** Client-friendly OT code format (§ owner TODO: confirm required format). */
export const otCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^HB-[A-Z0-9]{4,6}$/, 'Format: HB-XXXX');
