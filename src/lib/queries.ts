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
import { invoiceEmail } from './emailTemplates';

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
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ['shipment', vars.shipment.id] });
      void qc.invalidateQueries({ queryKey: ['tracking', vars.shipment.id] });
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
    mutationFn: async (args: { id: string; patch: Partial<Pick<Profile, 'full_name' | 'phone' | 'email'>> }) => {
      const { error } = await supabase.from('profiles').update(args.patch).eq('id', args.id);
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
        body: { to: args.toEmail, subject: mail.subject, html: mail.html, text: mail.text },
      });
      if (error) throw error;
      const res = (data ?? {}) as { ok?: boolean; simulated?: boolean };
      if (!res.ok) throw new Error('send_failed');
      return { ok: true, simulated: res.simulated };
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
        inval([['shipments'], ['shipment'], ['ot-lookup'], ['clients']]),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracking_events' }, () =>
        inval([['tracking'], ['shipment']]),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loads' }, () => inval([['loads']]))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () =>
        inval([['invoices'], ['op-invoices'], ['ot-lookup']]),
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
