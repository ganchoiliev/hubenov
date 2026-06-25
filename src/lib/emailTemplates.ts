/**
 * Transactional email bodies (inline-styled, table layout — email-client safe).
 * Rendered client-side, sent through the `send-email` Edge Function (Resend).
 */
import type { Currency, InvoiceStatus } from '@/types/domain';

function money(amount: number, currency: Currency, loc: string): string {
  return new Intl.NumberFormat(loc, { style: 'currency', currency }).format(amount);
}

export interface InvoiceEmailOpts {
  number: string;
  amount: number;
  currency: Currency;
  status: InvoiceStatus;
  clientName: string;
  locale: 'bg' | 'en';
  portalUrl: string;
}

export function invoiceEmail(o: InvoiceEmailOpts): { subject: string; html: string; text: string } {
  const loc = o.locale === 'en' ? 'en-GB' : 'bg-BG';
  const amt = money(o.amount, o.currency, loc);
  const brand = o.locale === 'bg' ? 'Доставки Хубенов' : 'Hubenov Deliveries';
  const statusLabel = {
    bg: { unpaid: 'Неплатена', paid: 'Платена', partial: 'Частично платена' },
    en: { unpaid: 'Unpaid', paid: 'Paid', partial: 'Partially paid' },
  }[o.locale][o.status];

  const t =
    o.locale === 'bg'
      ? {
          subject: `Фактура ${o.number} — ${brand}`,
          hi: `Здравейте, ${o.clientName || 'клиент'},`,
          intro: 'Изпращаме Ви фактура за нашите услуги.',
          invoice: 'Фактура',
          amount: 'Сума',
          status: 'Статус',
          cta: 'Виж в профила',
          pay: 'Може да платите в брой, по банков път или с карта в офиса.',
          foot: 'Ако имате въпроси, просто отговорете на този имейл.',
        }
      : {
          subject: `Invoice ${o.number} — ${brand}`,
          hi: `Hello ${o.clientName || 'there'},`,
          intro: 'Please find your invoice for our services below.',
          invoice: 'Invoice',
          amount: 'Amount',
          status: 'Status',
          cta: 'View in your account',
          pay: 'You can pay by cash, bank transfer, or card at the office.',
          foot: 'If you have any questions, just reply to this email.',
        };

  const row = (label: string, value: string, big = false, last = false) =>
    `<tr><td style="padding:14px 16px;${last ? '' : 'border-bottom:1px solid #f1f5f9;'}font-size:13px;color:#64748b;">${label}</td>` +
    `<td style="padding:14px 16px;${last ? '' : 'border-bottom:1px solid #f1f5f9;'}font-size:${big ? '18px' : '14px'};font-weight:${big ? '800' : '700'};text-align:right;color:#0f172a;">${value}</td></tr>`;

  const html = `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr><td style="background:#0f172a;padding:20px 28px;">
          <span style="color:#ffffff;font-size:18px;font-weight:800;letter-spacing:.2px;">${brand}</span>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="margin:0 0 6px;font-size:15px;">${t.hi}</p>
          <p style="margin:0 0 20px;font-size:14px;color:#475569;">${t.intro}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;border-collapse:separate;">
            ${row(t.invoice, o.number)}
            ${row(t.amount, amt, true)}
            ${row(t.status, statusLabel, false, true)}
          </table>
          <div style="text-align:center;margin:24px 0 8px;">
            <a href="${o.portalUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-size:14px;font-weight:700;">${t.cta}</a>
          </div>
          <p style="margin:18px 0 0;font-size:13px;color:#475569;">${t.pay}</p>
        </td></tr>
        <tr><td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">${t.foot}</p>
          <p style="margin:6px 0 0;font-size:12px;color:#94a3b8;">${brand} · hubenov.delivery</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = `${t.hi}\n${t.intro}\n\n${t.invoice}: ${o.number}\n${t.amount}: ${amt}\n${t.status}: ${statusLabel}\n\n${t.cta}: ${o.portalUrl}\n\n${t.pay}\n${brand} · hubenov.delivery`;

  return { subject: t.subject, html, text };
}
