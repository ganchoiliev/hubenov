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
    .or(`awb_barcode.eq.${c},public_code.eq.${c}`)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Shipment | null;
}

/** Fetch a client's OT code (for the printed label). */
export async function getClientCode(clientId: string): Promise<string | null> {
  const { data } = await supabase.from('profiles').select('client_code').eq('id', clientId).maybeSingle();
  return (data as { client_code: string } | null)?.client_code ?? null;
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
 * Best-effort: email affected clients about a status change. Batches the client
 * lookup and sends in parallel. Returns silently on any error — notifications
 * must never block or fail an operations action (B.L.A.S.T. — degrade safely).
 * Non-milestone statuses are skipped inside `statusEmail` (returns null).
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
      .select('id, email, full_name, preferred_locale, notify_email')
      .in('id', ids);
    type Row = {
      id: string;
      email: string | null;
      full_name: string | null;
      preferred_locale: string | null;
      notify_email: boolean | null;
    };
    const byId = new Map(((data ?? []) as Row[]).map((p) => [p.id, p]));
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    await Promise.allSettled(
      shipments.map(async (s) => {
        const c = byId.get(s.client_id);
        if (!c?.email || c.notify_email === false) return; // no email or opted out
        const mail = statusEmail({
          code: s.public_code,
          status: to,
          clientName: c.full_name ?? '',
          locale: c.preferred_locale === 'en' ? 'en' : 'bg',
          trackUrl: `${origin}/track?code=${encodeURIComponent(s.public_code)}`,
        });
        if (!mail) return;
        await supabase.functions.invoke('send-email', {
          body: { to: c.email, subject: mail.subject, html: mail.html, text: mail.text },
        });
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
      const { error: upErr } = await supabase
        .from('shipments')
        .update({ status: args.to })
        .eq('id', args.shipment.id);
      if (upErr) throw upErr;
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
  invoices: { paid: Record<string, number>; due: Record<string, number> };
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
      for (const i of inv) {
        const bucket = i.status === 'paid' ? paid : due; // due = unpaid + partial
        bucket[i.currency] = (bucket[i.currency] ?? 0) + Number(i.amount);
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
        invoices: { paid, due },
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

/* ── Global realtime sync — invalidate caches on any DB change (live UI) ───── */
export function useRealtimeSync() {
  const qc = useQueryClient();
  useEffect(() => {
    const inval = (keys: string[][]) => keys.forEach((k) => void qc.invalidateQueries({ queryKey: k }));
    const channel = supabase
      .channel('global-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments' }, () =>
        inval([['shipments'], ['shipment'], ['ot-lookup'], ['clients'], ['op-shipments'], ['dashboard'], ['load-stats'], ['cod-remit']]),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courier_shipments' }, () =>
        inval([['courier'], ['dashboard'], ['cod-remit']]),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracking_events' }, () =>
        inval([['tracking'], ['shipment']]),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loads' }, () => inval([['loads']]))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () =>
        inval([['invoices'], ['op-invoices'], ['ot-lookup'], ['dashboard']]),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pricing_rates' }, () =>
        inval([['pricing_rates']]),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'company_settings' }, () =>
        inval([['company_settings']]),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);
}
