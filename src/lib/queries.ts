/**
 * Server-state hooks (TanStack Query). All reads/writes go through Supabase
 * with RLS enforcing access — the browser is untrusted (A.N.T. — No-trust).
 */
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import type {
  Invoice,
  Load,
  Profile,
  Shipment,
  TrackingEvent,
  AnyStatus,
  Currency,
  PartySnapshot,
} from '@/types/domain';
import type { ShipmentInput } from '@/schemas';
import { invoiceEmail, statusEmail } from './emailTemplates';

/* ── Profile ─────────────────────────────────────────────────────────────── */
export function useMyProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

/* ── Shipments ───────────────────────────────────────────────────────────── */
export function useMyShipments(clientId: string | undefined) {
  return useQuery({
    queryKey: ['shipments', 'client', clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<Shipment[]> => {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Shipment[];
    },
  });
}

export function useShipment(id: string | undefined) {
  return useQuery({
    queryKey: ['shipment', id],
    enabled: !!id,
    queryFn: async (): Promise<Shipment | null> => {
      const { data, error } = await supabase.from('shipments').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data as unknown as Shipment | null;
    },
  });
}

export function useTrackingEvents(shipmentId: string | undefined) {
  return useQuery({
    queryKey: ['tracking', shipmentId],
    enabled: !!shipmentId,
    queryFn: async (): Promise<TrackingEvent[]> => {
      const { data, error } = await supabase
        .from('tracking_events')
        .select('*')
        .eq('shipment_id', shipmentId!)
        .order('occurred_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as TrackingEvent[];
    },
  });
}

/** Operator: resolve a scanned/typed code to a shipment (by AWB or public code). */
export async function resolveShipmentByCode(code: string): Promise<Shipment | null> {
  // Sanitize: the `.or` filter takes a raw PostgREST string, so restrict the
  // input to the safe code alphabet to avoid filter injection (§1 Secure).
  const c = code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (c.length < 3) return null;
  const { data, error } = await supabase
    .from('shipments')
    .select('*')
    .or(`awb_barcode.eq.${c},public_code.eq.${c},inbound_ref.eq.${c}`)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Shipment | null;
}

/** Fetch a client's OT code (for the printed label). */
export async function getClientCode(clientId: string): Promise<string | null> {
  const { data } = await supabase.from('profiles').select('client_code').eq('id', clientId).maybeSingle();
  return (data as { client_code: string } | null)?.client_code ?? null;
}

/** Operator: resolve a client's OT code from their id, e.g. to deep-link from a
 *  shipment to the owning client's record (/op/lookup?code=…). */
export function useClientCode(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-code', clientId],
    enabled: !!clientId,
    staleTime: 5 * 60_000,
    queryFn: () => getClientCode(clientId!),
  });
}

/* ── Operator: OT lookup (§7) ────────────────────────────────────────────── */
export function useOtLookup(code: string | null) {
  return useQuery({
    queryKey: ['ot-lookup', code],
    enabled: !!code,
    queryFn: async (): Promise<{ profile: Profile; shipments: Shipment[]; invoices: Invoice[] } | null> => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('client_code', code!)
        .maybeSingle();
      if (error) throw error;
      if (!profile) return null;
      const p = profile as Profile;
      const [{ data: shipments }, { data: invoices }] = await Promise.all([
        supabase.from('shipments').select('*').eq('client_id', p.id).order('created_at', { ascending: false }),
        supabase.from('invoices').select('*').eq('client_id', p.id).order('created_at', { ascending: false }),
      ]);
      return {
        profile: p,
        shipments: (shipments ?? []) as unknown as Shipment[],
        invoices: (invoices ?? []) as Invoice[],
      };
    },
  });
}

/* ── Courier (Econt) last-mile linkage — manual capture while API is off ───── */
export interface CourierShipment {
  id: string;
  shipment_id: string;
  carrier: string;
  carrier_ref: string | null;
  cod_amount: number | null;
  cod_currency: string | null;
  cod_remitted_at: string | null;
}

export function useCourierShipment(shipmentId: string | undefined) {
  return useQuery({
    queryKey: ['courier', shipmentId],
    enabled: !!shipmentId,
    queryFn: async (): Promise<CourierShipment | null> => {
      const { data, error } = await supabase
        .from('courier_shipments')
        .select('id, shipment_id, carrier, carrier_ref, cod_amount, cod_currency, cod_remitted_at')
        .eq('shipment_id', shipmentId!)
        .maybeSingle();
      if (error) throw error;
      return data as CourierShipment | null;
    },
  });
}

export function useSaveCourierRef() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      shipment_id: string;
      carrier_ref: string | null;
      cod_amount: number | null;
      cod_currency: string | null;
    }) => {
      // Upsert by shipment_id (unique idx, 0012). `as never`: generated types.
      const { error } = await supabase
        .from('courier_shipments')
        .upsert(
          {
            shipment_id: args.shipment_id,
            carrier: 'econt',
            carrier_ref: args.carrier_ref,
            cod_amount: args.cod_amount,
            cod_currency: args.cod_currency,
          } as never,
          { onConflict: 'shipment_id' },
        );
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ['courier', vars.shipment_id] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      void qc.invalidateQueries({ queryKey: ['cod-remit'] });
    },
  });
}

/** Mark (or un-mark) a shipment's COD as remitted to us by Econt. */
export function useMarkCodRemitted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { shipment_id: string; remitted: boolean }) => {
      const { error } = await supabase
        .from('courier_shipments')
        .update({ cod_remitted_at: args.remitted ? new Date().toISOString() : null } as never)
        .eq('shipment_id', args.shipment_id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ['courier', vars.shipment_id] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      void qc.invalidateQueries({ queryKey: ['cod-remit'] });
    },
  });
}

/* ── Loads ───────────────────────────────────────────────────────────────── */
export function useLoads() {
  return useQuery({
    queryKey: ['loads'],
    queryFn: async (): Promise<Load[]> => {
      const { data, error } = await supabase
        .from('loads')
        .select('*')
        .order('scheduled_departure', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Load[];
    },
  });
}

/* ── Invoices ────────────────────────────────────────────────────────────── */
export function useMyInvoices(clientId: string | undefined) {
  return useQuery({
    queryKey: ['invoices', clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<Invoice[]> => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Invoice[];
    },
  });
}

/* ── Mutations ───────────────────────────────────────────────────────────── */
export function useCreateShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ShipmentInput & { client_id: string; created_by: string }): Promise<Shipment> => {
      const { client_id, created_by, ...rest } = input;
      const { data, error } = await supabase
        .from('shipments')
        .insert({
          client_id,
          created_by,
          direction: rest.direction,
          parcel_type: rest.parcel_type,
          sender: rest.sender,
          receiver: rest.receiver,
          weight_kg: rest.weight_kg,
          length_cm: rest.length_cm,
          width_cm: rest.width_cm,
          height_cm: rest.height_cm,
          declared_value: rest.declared_value,
          currency: rest.currency,
          is_gift: rest.is_gift,
          notes: rest.notes ?? null,
          status: 'booked',
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as unknown as Shipment;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['shipments'] });
    },
  });
}

/**
 * Client self-service: pre-register an incoming parcel (Amazon/shop → our UK hub).
 * Creates a `booked` shipment carrying the courier tracking № as inbound_ref, so
 * when the box physically arrives the operator's Inbound scan matches it and the
 * label auto-prints. Dimensions fall back to the DB defaults (re-measured on arrival).
 */
interface IncomingParty {
  name: string;
  phone: string;
  line1: string;
  city: string;
  postcode: string;
  country: string;
  econt_office_code?: string | null;
}
export function useRegisterIncoming() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      client_id: string;
      inbound_ref: string;
      sender: IncomingParty;
      receiver: IncomingParty;
      weight_kg: number;
      declared_value: number;
      currency: Currency;
      notes: string | null;
    }): Promise<Shipment> => {
      const { data, error } = await supabase
        .from('shipments')
        .insert({
          client_id: input.client_id,
          created_by: input.client_id,
          direction: 'UK_BG',
          parcel_type: 'parcel',
          sender: input.sender,
          receiver: input.receiver,
          weight_kg: input.weight_kg,
          declared_value: input.declared_value,
          currency: input.currency,
          status: 'booked',
          inbound_ref: input.inbound_ref,
          notes: input.notes,
        } as never)
        .select('*')
        .single();
      if (error) throw error;
      return data as unknown as Shipment;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['shipments'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/** Shipment status → SMS template (only milestones get an SMS). */
const SMS_TEMPLATE: Partial<Record<AnyStatus, 'booked' | 'departed' | 'arrived' | 'out_for_delivery' | 'delivered' | 'exception'>> = {
  booked: 'booked',
  departed_uk: 'departed',
  arrived_bg_hub: 'arrived',
  out_for_delivery: 'out_for_delivery',
  delivered: 'delivered',
  exception: 'exception',
};

/**
 * Best-effort: notify affected clients about a status change — email (Resend)
 * and SMS (Vonage), in parallel. Returns silently on any error — notifications
 * must never block or fail an operations action (B.L.A.S.T. — degrade safely).
 * Non-milestone statuses are skipped (statusEmail returns null; no SMS template).
 */
export async function notifyStatusEmails(
  shipments: { public_code: string; client_id: string }[],
  to: AnyStatus,
): Promise<void> {
  try {
    const ids = [...new Set(shipments.map((s) => s.client_id))];
    if (ids.length === 0) return;

    // Global master switch — owner can pause all status emails. Resilient: if the
    // column doesn't exist yet (pre-0011), default ON rather than going silent.
    try {
      const { data: settings } = await supabase
        .from('company_settings')
        .select('notify_status_emails')
        .eq('id', 1)
        .maybeSingle();
      if (settings && (settings as { notify_status_emails?: boolean }).notify_status_emails === false) return;
    } catch {
      /* column missing pre-migration — treat as enabled */
    }

    const { data } = await supabase
      .from('profiles')
      .select('id, email, phone, full_name, preferred_locale, notify_email')
      .in('id', ids);
    type Row = {
      id: string;
      email: string | null;
      phone: string | null;
      full_name: string | null;
      preferred_locale: string | null;
      notify_email: boolean | null;
    };
    const byId = new Map(((data ?? []) as Row[]).map((p) => [p.id, p]));
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const smsTpl = SMS_TEMPLATE[to];
    await Promise.allSettled(
      shipments.map(async (s) => {
        const c = byId.get(s.client_id);
        if (!c || c.notify_email === false) return; // opted out of notifications
        const lc = c.preferred_locale === 'en' ? 'en' : 'bg';
        // Email (Resend)
        if (c.email) {
          const mail = statusEmail({
            code: s.public_code,
            status: to,
            clientName: c.full_name ?? '',
            locale: lc,
            trackUrl: `${origin}/track?code=${encodeURIComponent(s.public_code)}`,
          });
          if (mail) {
            await supabase.functions.invoke('send-email', {
              body: { to: c.email, subject: mail.subject, html: mail.html, text: mail.text },
            });
          }
        }
        // SMS (Vonage) — milestone statuses only, when a phone is on file.
        if (smsTpl && c.phone) {
          await supabase.functions.invoke('notify', {
            body: { channel: 'sms', to: c.phone, template: smsTpl, locale: lc, vars: { code: s.public_code } },
          });
        }
      }),
    );
  } catch (err) {
    console.warn('[status-notify] skipped:', err);
  }
}

/** Operator manual status change → writes a tracking event too (§6). */
export function useUpdateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      shipment: Shipment;
      to: AnyStatus;
      note_bg?: string;
      note_en?: string;
      source?: 'scan' | 'manual';
    }) => {
      // Optimistic concurrency: only move the parcel if it's still in the status
      // we think it is. Prevents two operators (or operator + scanner) clobbering
      // each other from a stale snapshot.
      const { data: upd, error: upErr } = await supabase
        .from('shipments')
        .update({ status: args.to })
        .eq('id', args.shipment.id)
        .eq('status', args.shipment.status)
        .select('id');
      if (upErr) throw upErr;
      if (!upd || upd.length === 0) throw new Error('stale_status');
      const { error: evErr } = await supabase.from('tracking_events').insert({
        shipment_id: args.shipment.id,
        leg: 'own',
        status: args.to,
        note_bg: args.note_bg ?? null,
        note_en: args.note_en ?? null,
        source: args.source ?? 'manual',
      });
      if (evErr) throw evErr;

      // Best-effort client notification (email now; SMS later). Never throws.
      await notifyStatusEmails(
        [{ public_code: args.shipment.public_code, client_id: args.shipment.client_id }],
        args.to,
      );
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ['shipment', vars.shipment.id] });
      void qc.invalidateQueries({ queryKey: ['tracking', vars.shipment.id] });
      void qc.invalidateQueries({ queryKey: ['shipments'] });
      void qc.invalidateQueries({ queryKey: ['op-shipments'] });
      void qc.invalidateQueries({ queryKey: ['ot-lookup'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    // On a stale-status conflict (or any failure) refresh so the UI shows reality.
    onError: (_e, vars) => {
      void qc.invalidateQueries({ queryKey: ['shipment', vars.shipment.id] });
      void qc.invalidateQueries({ queryKey: ['op-shipments'] });
      void qc.invalidateQueries({ queryKey: ['shipments'] });
    },
  });
}

/** Public, PII-safe track-by-number (§10) — calls the SECURITY DEFINER RPC. */
export interface PublicTracking {
  public_code: string;
  direction: string;
  status: AnyStatus;
  updated_at: string;
  events: {
    status: AnyStatus;
    leg: string;
    location: string | null;
    note_bg: string | null;
    note_en: string | null;
    occurred_at: string;
  }[];
}

export async function trackPublic(code: string): Promise<PublicTracking | null> {
  const { data, error } = await supabase.rpc('track_public', { p_code: code });
  if (error) throw error;
  return (data as PublicTracking | null) ?? null;
}

/* ── Company settings (operator-configurable: EORI, label, print) ─────────── */
export interface CompanySettings {
  id: number;
  company_name: string;
  eori: string | null;
  label_size: 'A6' | '100x150' | 'A4';
  print_method: 'browser' | 'qz';
  return_address: string | null;
  notify_status_emails: boolean;
  updated_at: string;
}

export function useCompanySettings() {
  return useQuery({
    queryKey: ['company_settings'],
    queryFn: async (): Promise<CompanySettings | null> => {
      const { data, error } = await supabase.from('company_settings').select('*').eq('id', 1).maybeSingle();
      if (error) throw error;
      return data as CompanySettings | null;
    },
  });
}

export function useUpdateCompanySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Omit<CompanySettings, 'id' | 'updated_at'>>) => {
      const { error } = await supabase
        .from('company_settings')
        // `as never`: generated DB types predate this table — regenerate with
        // `npm run db:types` after applying migration 0007 to type it properly.
        .update({ ...patch, updated_at: new Date().toISOString() } as never)
        .eq('id', 1);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['company_settings'] }),
  });
}

/* ── Clients (operator: every client + their shipment count) ──────────────── */
export interface ClientRow {
  id: string;
  full_name: string;
  client_code: string;
  phone: string | null;
  email: string | null;
  created_at: string;
  shipment_count: number;
}

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async (): Promise<ClientRow[]> => {
      // `shipments!client_id(count)` disambiguates the embed: shipments has TWO
      // FKs to profiles (client_id + created_by), so the column hint is required.
      // Cast via `unknown` — generated DB types don't model the aggregate embed.
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, client_code, phone, email, created_at, shipments!client_id(count)')
        .eq('role', 'client')
        .order('created_at', { ascending: false });
      if (error) throw error;
      type Row = {
        id: string;
        full_name: string;
        client_code: string;
        phone: string | null;
        email: string | null;
        created_at: string;
        shipments?: { count: number }[];
      };
      return ((data ?? []) as unknown as Row[]).map((row) => ({
        id: row.id,
        full_name: row.full_name,
        client_code: row.client_code,
        phone: row.phone,
        email: row.email,
        created_at: row.created_at,
        shipment_count: row.shipments?.[0]?.count ?? 0,
      }));
    },
  });
}

/* ── Operator: edit a customer's profile (staff-only via RLS) ─────────────── */
export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      patch: Partial<Pick<Profile, 'full_name' | 'phone' | 'email' | 'notify_email'>>;
    }) => {
      // `as never`: generated DB types predate profiles.notify_email (0011).
      const { error } = await supabase.from('profiles').update(args.patch as never).eq('id', args.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ot-lookup'] });
      void qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

/* ── Invoices: create + email (operator) ──────────────────────────────────── */
export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      client_id: string;
      amount: number;
      currency: Currency;
      shipment_id?: string | null;
    }): Promise<Invoice> => {
      // One invoice per shipment (0013 unique index is the hard guard; this
      // pre-check lets callers surface "already invoiced" instead of a raw error).
      if (input.shipment_id) {
        const { data: existing } = await supabase
          .from('invoices')
          .select('id')
          .eq('shipment_id', input.shipment_id)
          .maybeSingle();
        if (existing) throw new Error('invoice_exists');
      }
      const { data, error } = await supabase
        .from('invoices')
        // `number` is auto-filled by the 0010 trigger (INV-0001…); `status`
        // defaults to 'unpaid'. `as never`: generated types still require number.
        .insert({
          client_id: input.client_id,
          amount: input.amount,
          currency: input.currency,
          shipment_id: input.shipment_id ?? null,
        } as never)
        .select('*')
        .single();
      if (error) throw error;
      return data as unknown as Invoice;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ot-lookup'] });
      void qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

/** Send an invoice to the client by email via the staff-only `send-email` fn. */
export function useSendInvoiceEmail() {
  return useMutation({
    mutationFn: async (args: {
      invoice: Invoice;
      toEmail: string;
      clientName: string;
      locale: 'bg' | 'en';
    }): Promise<{ ok: boolean; simulated?: boolean }> => {
      // Linked shipment code + company details for the attached PDF (best-effort).
      let shipmentCode: string | null = null;
      if (args.invoice.shipment_id) {
        const { data: ship } = await supabase
          .from('shipments')
          .select('public_code')
          .eq('id', args.invoice.shipment_id)
          .maybeSingle();
        shipmentCode = (ship as { public_code?: string } | null)?.public_code ?? null;
      }
      const { data: settings } = await supabase
        .from('company_settings')
        .select('company_name, eori, return_address')
        .eq('id', 1)
        .maybeSingle();
      const s = settings as { company_name?: string; eori?: string | null; return_address?: string | null } | null;

      // Lazy-load pdf-lib (heavy) so it never enters the main bundle.
      const { buildInvoicePdf, bytesToBase64 } = await import('./invoicePdf');
      const pdf = await buildInvoicePdf({
        number: args.invoice.number,
        dateISO: args.invoice.created_at,
        amount: args.invoice.amount,
        currency: args.invoice.currency,
        status: args.invoice.status,
        clientName: args.clientName,
        clientEmail: args.toEmail,
        company: { name: s?.company_name, eori: s?.eori, returnAddress: s?.return_address },
        shipmentCode,
        locale: args.locale,
      });

      const mail = invoiceEmail({
        number: args.invoice.number,
        amount: args.invoice.amount,
        currency: args.invoice.currency,
        status: args.invoice.status,
        clientName: args.clientName,
        locale: args.locale,
        portalUrl: `${window.location.origin}/portal/invoices`,
      });
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: args.toEmail,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          attachments: [{ filename: `${args.invoice.number}.pdf`, content: bytesToBase64(pdf) }],
        },
      });
      if (error) throw error;
      const res = (data ?? {}) as { ok?: boolean; simulated?: boolean };
      if (!res.ok) throw new Error('send_failed');
      return { ok: true, simulated: res.simulated };
    },
  });
}

/** Operator: create a walk-in client (no account). Returns the new profile. */
export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      full_name: string;
      phone?: string | null;
      email?: string | null;
      preferred_locale?: 'bg' | 'en';
    }): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        // `as never`: walk-in insert (user_id null, client_code auto) — generated types predate 0009.
        .insert({
          role: 'client',
          full_name: input.full_name,
          phone: input.phone ?? null,
          email: input.email ?? null,
          preferred_locale: input.preferred_locale ?? 'bg',
        } as never)
        .select('*')
        .single();
      if (error) throw error;
      return data as unknown as Profile;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['clients'] }),
  });
}

/* ── Operator dashboard (money + ops at-a-glance) ─────────────────────────── */
export interface OperatorDashboard {
  shipments: { total: number; active: number; today: number; delivered: number; byStatus: Record<string, number> };
  invoices: { paid: Record<string, number>; due: Record<string, number>; dueCount: number };
  cod: {
    collecting: Record<string, number>; // out for collection (in transit)
    awaiting: Record<string, number>; // delivered, Econt holding our cash
    collectingCount: number;
    awaitingCount: number;
  };
}

export function useOperatorDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async (): Promise<OperatorDashboard> => {
      const [shRes, invRes, codRes] = await Promise.all([
        supabase.from('shipments').select('status, created_at').limit(5000),
        supabase.from('invoices').select('amount, currency, status').limit(5000),
        supabase
          .from('courier_shipments')
          .select('cod_amount, cod_currency, cod_remitted_at, shipments!shipment_id(status, currency)')
          .not('cod_amount', 'is', null)
          .limit(5000),
      ]);

      const sh = (shRes.data ?? []) as { status: string; created_at: string }[];
      const startToday = new Date();
      startToday.setHours(0, 0, 0, 0);
      const terminal = new Set(['delivered', 'cancelled', 'returned']);
      const byStatus: Record<string, number> = {};
      let active = 0;
      let today = 0;
      let delivered = 0;
      for (const s of sh) {
        byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
        if (!terminal.has(s.status)) active += 1;
        if (s.status === 'delivered') delivered += 1;
        if (new Date(s.created_at) >= startToday) today += 1;
      }

      const inv = (invRes.data ?? []) as { amount: number; currency: string; status: string }[];
      const paid: Record<string, number> = {};
      const due: Record<string, number> = {};
      let dueCount = 0;
      for (const i of inv) {
        if (i.status === 'void') continue; // cancelled — excluded from all totals
        if (i.status === 'paid') {
          paid[i.currency] = (paid[i.currency] ?? 0) + Number(i.amount);
        } else {
          due[i.currency] = (due[i.currency] ?? 0) + Number(i.amount); // unpaid + partial
          dueCount += 1;
        }
      }

      const cod = (codRes.data ?? []) as unknown as {
        cod_amount: number;
        cod_currency: string | null;
        cod_remitted_at: string | null;
        shipments: { status: string; currency: string } | null;
      }[];
      const collecting: Record<string, number> = {};
      const awaiting: Record<string, number> = {};
      let collectingCount = 0;
      let awaitingCount = 0;
      const codTerminal = new Set(['cancelled', 'returned']);
      for (const c of cod) {
        const st = c.shipments?.status;
        if (!st || codTerminal.has(st)) continue;
        const ccy = c.cod_currency ?? c.shipments?.currency ?? 'BGN';
        const amt = Number(c.cod_amount);
        if (st === 'delivered') {
          if (!c.cod_remitted_at) {
            awaiting[ccy] = (awaiting[ccy] ?? 0) + amt;
            awaitingCount += 1;
          }
        } else {
          collecting[ccy] = (collecting[ccy] ?? 0) + amt;
          collectingCount += 1;
        }
      }

      return {
        shipments: { total: sh.length, active, today, delivered, byStatus },
        invoices: { paid, due, dueCount },
        cod: { collecting, awaiting, collectingCount, awaitingCount },
      };
    },
  });
}

/* ── COD reconciliation list (delivered, Econt holding our cash) ──────────── */
export interface CodAwaitingRow {
  shipment_id: string;
  public_code: string;
  receiver_name: string;
  cod_amount: number;
  cod_currency: string;
}

export function useCodAwaitingRemittance() {
  return useQuery({
    queryKey: ['cod-remit'],
    queryFn: async (): Promise<CodAwaitingRow[]> => {
      const { data, error } = await supabase
        .from('courier_shipments')
        .select('shipment_id, cod_amount, cod_currency, shipments!shipment_id(public_code, status, currency, receiver)')
        .not('cod_amount', 'is', null)
        .is('cod_remitted_at', null)
        .limit(300);
      if (error) throw error;
      const rows = (data ?? []) as unknown as {
        shipment_id: string;
        cod_amount: number;
        cod_currency: string | null;
        shipments: { public_code: string; status: string; currency: string; receiver: { name?: string } | null } | null;
      }[];
      return rows
        .filter((r) => r.shipments?.status === 'delivered')
        .map((r) => ({
          shipment_id: r.shipment_id,
          public_code: r.shipments?.public_code ?? '',
          receiver_name: r.shipments?.receiver?.name ?? '',
          cod_amount: Number(r.cod_amount),
          cod_currency: r.cod_currency ?? r.shipments?.currency ?? 'BGN',
        }));
    },
  });
}

/* ── Weekly volume (last 8 weeks) for the dashboard chart ─────────────────── */
export interface WeekStat {
  label: string;
  parcels: number;
}

export function useWeeklyStats() {
  return useQuery({
    queryKey: ['weekly-stats'],
    queryFn: async (): Promise<WeekStat[]> => {
      const WEEK = 7 * 24 * 60 * 60 * 1000;
      const since = new Date(Date.now() - 8 * WEEK).toISOString();
      const { data, error } = await supabase
        .from('shipments')
        .select('created_at')
        .gte('created_at', since)
        .limit(5000);
      if (error) throw error;
      const now = Date.now();
      const buckets = Array.from({ length: 8 }, () => 0);
      for (const r of (data ?? []) as { created_at: string }[]) {
        const wAgo = Math.floor((now - new Date(r.created_at).getTime()) / WEEK);
        if (wAgo >= 0 && wAgo < 8) buckets[wAgo] = (buckets[wAgo] ?? 0) + 1;
      }
      const out: WeekStat[] = [];
      for (let i = 7; i >= 0; i--) {
        const d = new Date(now - i * WEEK);
        const label = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
        out.push({ label, parcels: buckets[i] ?? 0 });
      }
      return out;
    },
  });
}

/* ── Parcels needing attention (exceptions + stuck early-stage at the hub) ──── */
export interface AttentionRow {
  id: string;
  public_code: string;
  status: string;
  receiver_name: string;
  days: number;
}

export function useStuckShipments() {
  return useQuery({
    queryKey: ['stuck'],
    queryFn: async (): Promise<AttentionRow[]> => {
      const { data, error } = await supabase
        .from('shipments')
        .select('id, public_code, status, receiver, created_at')
        .in('status', ['at_uk_hub', 'exception'])
        .order('created_at', { ascending: true })
        .limit(50);
      if (error) throw error;
      const now = Date.now();
      const rows = (data ?? []) as unknown as {
        id: string;
        public_code: string;
        status: string;
        receiver: { name?: string } | null;
        created_at: string;
      }[];
      return rows
        .map((r) => ({
          id: r.id,
          public_code: r.public_code,
          status: r.status,
          receiver_name: r.receiver?.name ?? '',
          days: Math.floor((now - new Date(r.created_at).getTime()) / 86_400_000),
        }))
        // exceptions always; early-stage parcels only once older than 9 days (missed a Friday van)
        .filter((r) => r.status === 'exception' || r.days >= 9)
        .slice(0, 8);
    },
  });
}

/* ── Top destination cities (for the dashboard chart) ─────────────────────── */
export interface CityStat {
  city: string;
  parcels: number;
}

export function useTopCities() {
  return useQuery({
    queryKey: ['top-cities'],
    queryFn: async (): Promise<CityStat[]> => {
      const { data, error } = await supabase.from('shipments').select('receiver').limit(5000);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const r of (data ?? []) as { receiver: { city?: string } | null }[]) {
        const c = (r.receiver?.city ?? '').trim();
        if (c) counts[c] = (counts[c] ?? 0) + 1;
      }
      return Object.entries(counts)
        .map(([city, parcels]) => ({ city, parcels }))
        .sort((a, b) => b.parcels - a.parcels)
        .slice(0, 6);
    },
  });
}

/* ── Client: my incoming (pre-registered) parcels ─────────────────────────── */
export interface IncomingParcel {
  id: string;
  public_code: string;
  status: AnyStatus;
  inbound_ref: string | null;
  notes: string | null;
  created_at: string;
  receiver: { name?: string; phone?: string; line1?: string; city?: string; postcode?: string; econt_office_code?: string | null } | null;
}
export function useMyIncoming(clientId: string | undefined) {
  return useQuery({
    queryKey: ['my-incoming', clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<IncomingParcel[]> => {
      const { data, error } = await supabase
        .from('shipments')
        .select('id, public_code, status, inbound_ref, notes, created_at, receiver')
        .eq('client_id', clientId!)
        .not('inbound_ref', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as IncomingParcel[];
    },
  });
}

/* ── Dashboard period summary (date-range scoped metrics) ──────────────────── */
export interface DashboardPeriod {
  parcels: number;
  delivered: number;
  invoiced: Record<string, number>;
  paid: Record<string, number>;
}
export function useDashboardPeriod(fromISO: string, toISO: string) {
  return useQuery({
    queryKey: ['dash-period', fromISO, toISO],
    queryFn: async (): Promise<DashboardPeriod> => {
      const [sh, inv] = await Promise.all([
        supabase.from('shipments').select('status').gte('created_at', fromISO).lt('created_at', toISO).limit(10000),
        supabase.from('invoices').select('amount, currency, status').gte('created_at', fromISO).lt('created_at', toISO).limit(10000),
      ]);
      const ships = (sh.data ?? []) as unknown as { status: string }[];
      const invoiced: Record<string, number> = {};
      const paid: Record<string, number> = {};
      for (const i of (inv.data ?? []) as unknown as { amount: number; currency: string; status: string }[]) {
        if (i.status === 'void') continue;
        invoiced[i.currency] = (invoiced[i.currency] ?? 0) + Number(i.amount);
        if (i.status === 'paid') paid[i.currency] = (paid[i.currency] ?? 0) + Number(i.amount);
      }
      return {
        parcels: ships.length,
        delivered: ships.filter((s) => s.status === 'delivered').length,
        invoiced,
        paid,
      };
    },
  });
}

/* ── Operator awareness: new requests (booked parcels) + new clients ──────── */
export interface BookedRow {
  id: string;
  public_code: string;
  receiver_name: string;
  receiver_city: string;
  created_at: string;
  inbound_ref: string | null;
}
export function useBookedShipments() {
  return useQuery({
    queryKey: ['booked'],
    queryFn: async (): Promise<BookedRow[]> => {
      const { data, error } = await supabase
        .from('shipments')
        .select('id, public_code, receiver, created_at, inbound_ref')
        .eq('status', 'booked')
        .order('created_at', { ascending: false })
        .limit(15);
      if (error) throw error;
      return ((data ?? []) as unknown as { id: string; public_code: string; receiver: { name?: string; city?: string } | null; created_at: string; inbound_ref: string | null }[]).map(
        (r) => ({ id: r.id, public_code: r.public_code, receiver_name: r.receiver?.name ?? '', receiver_city: r.receiver?.city ?? '', created_at: r.created_at, inbound_ref: r.inbound_ref }),
      );
    },
  });
}

export interface NewClientRow {
  id: string;
  full_name: string;
  client_code: string;
  created_at: string;
}
export function useNewClients() {
  return useQuery({
    queryKey: ['new-clients'],
    queryFn: async (): Promise<NewClientRow[]> => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, client_code, created_at')
        .eq('role', 'client')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(15);
      if (error) throw error;
      return (data ?? []) as NewClientRow[];
    },
  });
}

/* ── Messaging: operator inbox + unread badges ─────────────────────────────── */
export interface OpConversation {
  id: string;
  client_id: string;
  updated_at: string;
  client_name: string;
  client_code: string | null;
  last_body: string | null;
  last_sender_id: string | null;
  last_at: string | null;
  unread: boolean;
}
interface RawConv {
  id: string;
  client_id: string;
  updated_at: string;
  operator_last_read_at: string | null;
  client: { full_name?: string | null; client_code?: string | null } | { full_name?: string | null; client_code?: string | null }[] | null;
  messages: { body: string; sender_id: string; created_at: string }[] | null;
}

/** Operator inbox: every client conversation + its newest message + unread flag. */
export function useOpConversations() {
  return useQuery({
    queryKey: ['op-conversations'],
    queryFn: async (): Promise<OpConversation[]> => {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, client_id, updated_at, operator_last_read_at, client:profiles(full_name, client_code), messages(body, sender_id, created_at)')
        .order('updated_at', { ascending: false })
        .order('created_at', { referencedTable: 'messages', ascending: false })
        .limit(1, { referencedTable: 'messages' })
        .limit(100);
      if (error) throw error;
      return ((data ?? []) as unknown as RawConv[]).map((r) => {
        const client = Array.isArray(r.client) ? r.client[0] : r.client;
        const last = r.messages?.[0] ?? null;
        const unread =
          !!last && last.sender_id === r.client_id && (!r.operator_last_read_at || last.created_at > r.operator_last_read_at);
        return {
          id: r.id,
          client_id: r.client_id,
          updated_at: r.updated_at,
          client_name: client?.full_name ?? '',
          client_code: client?.client_code ?? null,
          last_body: last?.body ?? null,
          last_sender_id: last?.sender_id ?? null,
          last_at: last?.created_at ?? null,
          unread,
        };
      });
    },
  });
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}
export function useConversationMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['conversation-messages', conversationId],
    enabled: !!conversationId,
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, body, created_at')
        .eq('conversation_id', conversationId as string)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ChatMessage[];
    },
  });
}

/** Insert a message, then fire a best-effort cross-side email alert. */
export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { conversationId: string; senderId: string; body: string }) => {
      const { error } = await supabase
        .from('messages')
        .insert({ conversation_id: args.conversationId, sender_id: args.senderId, body: args.body });
      if (error) throw error;
      // The chat is already persisted; the email is a nice-to-have. Never throw.
      try {
        await supabase.functions.invoke('message-notify', { body: { conversation_id: args.conversationId } });
      } catch {
        /* notification is non-critical */
      }
    },
    onSuccess: (_d, args) => {
      void qc.invalidateQueries({ queryKey: ['conversation-messages', args.conversationId] });
      void qc.invalidateQueries({ queryKey: ['op-conversations'] });
      void qc.invalidateQueries({ queryKey: ['op-unread'] });
      void qc.invalidateQueries({ queryKey: ['client-unread'] });
    },
  });
}

export function useMarkConversationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { conversationId: string; side: 'operator' | 'client' }) => {
      const now = new Date().toISOString();
      const patch = args.side === 'operator' ? { operator_last_read_at: now } : { client_last_read_at: now };
      const { error } = await supabase.from('conversations').update(patch).eq('id', args.conversationId);
      if (error) throw error;
      return args.side;
    },
    onSuccess: (side) => {
      void qc.invalidateQueries({ queryKey: side === 'operator' ? ['op-unread'] : ['client-unread'] });
      void qc.invalidateQueries({ queryKey: ['op-conversations'] });
    },
  });
}

/** RPC returning an int. Cast around the placeholder DB types (no Functions entry). */
async function rpcInt(fn: string): Promise<number> {
  const rpc = supabase.rpc as unknown as (name: string) => Promise<{ data: number | null; error: { message: string } | null }>;
  const { data, error } = await rpc(fn);
  if (error) throw error;
  return data ?? 0;
}
export function useOpUnread(enabled: boolean) {
  return useQuery({ queryKey: ['op-unread'], enabled, queryFn: () => rpcInt('op_unread_count') });
}
export function useClientUnread(enabled: boolean) {
  return useQuery({ queryKey: ['client-unread'], enabled, queryFn: () => rpcInt('client_unread_count') });
}

/* ── Destructive ops (hard delete; 0016 trigger snapshots each into audit_log) */
function asDeleteError(e: unknown): Error {
  const err = e as { code?: string; message?: string } | null;
  // 23503 = FK violation → the row still has linked records (e.g. a client with
  // parcels/invoices). Surface a sentinel the UI maps to a clear message.
  if (err?.code === '23503' || /foreign key|violates foreign/i.test(err?.message ?? '')) {
    return new Error('linked_records');
  }
  return e instanceof Error ? e : new Error('delete_failed');
}
function invalAll(qc: ReturnType<typeof useQueryClient>, keys: string[][]) {
  keys.forEach((k) => void qc.invalidateQueries({ queryKey: k }));
}

export function useDeleteShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shipments').delete().eq('id', id);
      if (error) throw asDeleteError(error);
    },
    onSuccess: () =>
      invalAll(qc, [['shipments'], ['op-shipments'], ['shipment'], ['dashboard'], ['load-stats'], ['weekly-stats'], ['stuck'], ['top-cities'], ['booked'], ['ot-lookup'], ['my-incoming'], ['invoices'], ['op-invoices']]),
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw asDeleteError(error);
    },
    onSuccess: () => invalAll(qc, [['invoices'], ['op-invoices'], ['dashboard'], ['ot-lookup']]),
  });
}

/** Void an issued invoice — keeps the row + number, excluded from totals. */
export function useVoidInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('invoices').update({ status: 'void' } as never).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalAll(qc, [['invoices'], ['op-invoices'], ['dashboard'], ['ot-lookup']]),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw asDeleteError(error);
    },
    onSuccess: () => invalAll(qc, [['clients'], ['new-clients'], ['dashboard']]),
  });
}

export function useDeleteLoad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('loads').delete().eq('id', id);
      if (error) throw asDeleteError(error);
    },
    onSuccess: () => invalAll(qc, [['loads'], ['load-stats'], ['shipments'], ['op-shipments'], ['dashboard']]),
  });
}

/* ── Bulk shipment ops (van prep) ──────────────────────────────────────────── */
export function useBulkAssignLoad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { ids: string[]; loadId: string }) => {
      const { error } = await supabase.from('shipments').update({ load_id: args.loadId }).in('id', args.ids);
      if (error) throw error;
    },
    onSuccess: () => invalAll(qc, [['op-shipments'], ['shipments'], ['loads'], ['load-stats'], ['dashboard'], ['booked']]),
  });
}

export function useBulkDeleteShipments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('shipments').delete().in('id', ids);
      if (error) throw asDeleteError(error);
    },
    onSuccess: () =>
      invalAll(qc, [['op-shipments'], ['shipments'], ['shipment'], ['dashboard'], ['load-stats'], ['weekly-stats'], ['stuck'], ['top-cities'], ['booked'], ['ot-lookup'], ['my-incoming'], ['invoices'], ['op-invoices']]),
  });
}

/** Edit a parcel's weight/dimensions/value/price after intake; the linked
 *  not-yet-paid invoice is re-synced to the new price in the same call. */
export function useUpdateParcel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      weight_kg: number;
      length_cm: number;
      width_cm: number;
      height_cm: number;
      declared_value: number;
      price: number | null;
    }) => {
      const { id, ...patch } = args;
      const { error } = await supabase.from('shipments').update(patch).eq('id', id);
      if (error) throw error;
      if (patch.price != null) {
        await supabase.from('invoices').update({ amount: patch.price }).eq('shipment_id', id).neq('status', 'paid');
      }
    },
    onSuccess: () =>
      invalAll(qc, [['shipment'], ['op-shipments'], ['shipments'], ['invoices'], ['op-invoices'], ['dashboard'], ['weekly-stats'], ['top-cities'], ['ot-lookup']]),
  });
}

/* ── Audit log (who deleted/changed what) ──────────────────────────────────── */
export interface AuditRow {
  id: string;
  at: string;
  action: string;
  entity: string;
  entity_id: string | null;
  actor_name: string | null;
  summary: string;
}
export function useAuditLog() {
  return useQuery({
    queryKey: ['audit-log'],
    queryFn: async (): Promise<AuditRow[]> => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('id, at, action, entity, entity_id, meta, actor:profiles(full_name)')
        .order('at', { ascending: false })
        .limit(150);
      if (error) throw error;
      type Raw = {
        id: string;
        at: string;
        action: string;
        entity: string;
        entity_id: string | null;
        meta: Record<string, unknown> | null;
        actor: { full_name?: string | null } | { full_name?: string | null }[] | null;
      };
      return ((data ?? []) as unknown as Raw[]).map((r) => {
        const actor = Array.isArray(r.actor) ? r.actor[0] : r.actor;
        const m = r.meta ?? {};
        const summary =
          (m.public_code as string) ||
          (m.number as string) ||
          (m.full_name as string) ||
          (m.code as string) ||
          (r.entity_id ? r.entity_id.slice(0, 8) : '');
        return {
          id: r.id,
          at: r.at,
          action: r.action,
          entity: r.entity,
          entity_id: r.entity_id,
          actor_name: actor?.full_name ?? null,
          summary,
        };
      });
    },
  });
}

/* ── Global search (command palette): parcels + clients + invoices ─────────── */
export interface SearchHit {
  kind: 'parcel' | 'client' | 'invoice';
  id: string;
  label: string;
  sub: string;
  to: string;
}
export function useGlobalSearch(term: string) {
  const t = term.trim();
  return useQuery({
    queryKey: ['global-search', t],
    enabled: t.length >= 2,
    staleTime: 10_000,
    queryFn: async (): Promise<SearchHit[]> => {
      // Strip chars that would break the PostgREST or() filter grammar.
      const safe = t.replace(/[,()*]/g, ' ').trim();
      if (!safe) return [];
      const star = `*${safe}*`; // or()-filter wildcard is * (not %)
      const pct = `%${safe}%`;
      // Parcel code/AWB and receiver-name are two separate queries so a search by
      // code never depends on the JSON receiver filter being supported.
      const [byCode, byReceiver, cl, inv] = await Promise.all([
        supabase
          .from('shipments')
          .select('id, public_code, receiver')
          .or(`public_code.ilike.${star},awb_barcode.ilike.${star}`)
          .order('created_at', { ascending: false })
          .limit(6),
        supabase
          .from('shipments')
          .select('id, public_code, receiver')
          .ilike('receiver->>name', pct)
          .order('created_at', { ascending: false })
          .limit(6),
        supabase
          .from('profiles')
          .select('id, full_name, client_code, phone, email')
          .eq('role', 'client')
          .or(`full_name.ilike.${star},client_code.ilike.${star},phone.ilike.${star},email.ilike.${star}`)
          .limit(6),
        supabase.from('invoices').select('id, number').ilike('number', pct).limit(6),
      ]);
      type ShipRow = { id: string; public_code: string; receiver: { name?: string } | null };
      type CliRow = { id: string; full_name: string | null; client_code: string };
      type InvRow = { id: string; number: string };
      const hits: SearchHit[] = [];
      const seen = new Set<string>();
      for (const r of [...((byCode.data ?? []) as unknown as ShipRow[]), ...((byReceiver.data ?? []) as unknown as ShipRow[])]) {
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        hits.push({ kind: 'parcel', id: r.id, label: r.public_code, sub: r.receiver?.name ?? '', to: `/op/shipments/${r.id}` });
      }
      for (const r of (cl.data ?? []) as unknown as CliRow[])
        hits.push({ kind: 'client', id: r.id, label: r.full_name || r.client_code, sub: r.client_code, to: `/op/lookup?code=${encodeURIComponent(r.client_code)}` });
      for (const r of (inv.data ?? []) as unknown as InvRow[])
        hits.push({ kind: 'invoice', id: r.id, label: r.number, sub: '', to: '/op/invoices' });
      return hits;
    },
  });
}

/* ── Global realtime sync — invalidate caches on any DB change (live UI) ───── */
export function useRealtimeSync() {
  const qc = useQueryClient();
  useEffect(() => {
    const inval = (keys: string[][]) => keys.forEach((k) => void qc.invalidateQueries({ queryKey: k }));
    const channel = supabase
      .channel('global-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments' }, () =>
        inval([['shipments'], ['shipment'], ['ot-lookup'], ['clients'], ['op-shipments'], ['dashboard'], ['load-stats'], ['cod-remit'], ['weekly-stats'], ['stuck'], ['top-cities'], ['my-incoming'], ['booked'], ['dash-period'], ['run-sheet']]),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courier_shipments' }, () =>
        inval([['courier'], ['dashboard'], ['cod-remit']]),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () =>
        inval([['new-clients'], ['clients']]),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracking_events' }, () =>
        inval([['tracking'], ['shipment']]),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loads' }, () => inval([['loads']]))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () =>
        inval([['invoices'], ['op-invoices'], ['ot-lookup'], ['dashboard'], ['dash-period']]),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pricing_rates' }, () =>
        inval([['pricing_rates']]),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'company_settings' }, () =>
        inval([['company_settings']]),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () =>
        inval([['op-conversations'], ['op-unread'], ['client-unread'], ['conversation-messages']]),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () =>
        inval([['op-conversations'], ['op-unread'], ['client-unread']]),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);
}

/* ── Recent sender/receiver parties for a client (intake quick-pick) ──────── */
export function useClientRecentParties(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-recent-parties', clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<{ senders: PartySnapshot[]; receivers: PartySnapshot[] }> => {
      // Long-term recipient/sender book: derive from the client's whole history,
      // ranked by how often each party is used (then recency). No extra table —
      // shipment snapshots already carry name + phone + address + Econt office.
      const { data, error } = await supabase
        .from('shipments')
        .select('sender, receiver, created_at')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      const rows = (data ?? []) as unknown as { sender: PartySnapshot | null; receiver: PartySnapshot | null }[];
      const rank = (parties: (PartySnapshot | null)[], max: number): PartySnapshot[] => {
        const map = new Map<string, { p: PartySnapshot; count: number; order: number }>();
        let order = 0;
        for (const p of parties) {
          if (!p || !p.name?.trim()) continue;
          const key = [p.name, p.line1, p.city, p.postcode, p.econt_office_code].join('|').toLowerCase().trim();
          const hit = map.get(key);
          if (hit) hit.count += 1;
          // First time we see a key it's the most recent use (rows are desc).
          else map.set(key, { p, count: 1, order: order++ });
        }
        return [...map.values()]
          .sort((a, b) => b.count - a.count || a.order - b.order)
          .slice(0, max)
          .map((x) => x.p);
      };
      return {
        senders: rank(rows.map((r) => r.sender), 3),
        receivers: rank(rows.map((r) => r.receiver), 8),
      };
    },
  });
}
