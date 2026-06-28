import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, MapPin, Info } from 'lucide-react';
import { Card, CardBody, Button } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { HUB_ADDRESS, hubRecipientName, hubAddressLines } from '@/config/hub';

/**
 * The client's personal "ship here" address: the Manchester hub plus their OT code
 * in the recipient name, so an order placed at Amazon/eBay arrives physically
 * labelled with HB-XXXX — the identifier we always match on at receiving.
 */
export function HubAddress({ fullName, clientCode }: { fullName: string; clientCode: string }) {
  const { i18n } = useTranslation();
  const bg = (i18n.resolvedLanguage ?? 'bg').toLowerCase().startsWith('bg');
  const toast = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  const recipient = hubRecipientName(fullName, clientCode);
  const fullBlock = hubAddressLines(fullName, clientCode).join('\n');

  const copy = (text: string, key: string, label: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success(label);
    window.setTimeout(() => setCopied((k) => (k === key ? null : k)), 1500);
  };

  const addrLine = `${HUB_ADDRESS.line1}, ${HUB_ADDRESS.line2}, ${HUB_ADDRESS.city} ${HUB_ADDRESS.postcode}`;
  const T = bg
    ? {
        title: 'Вашият адрес за поръчки от UK',
        intro: 'Поръчайте от Amazon, eBay и други UK магазини на този адрес. Щом колетът пристигне при нас, го изпращаме до вас в България.',
        recipientLabel: 'Име на получател (с вашия код)',
        copyName: 'Копирай',
        copyAll: 'Копирай адреса',
        copied: 'Копирано',
        howTitle: 'Как да поръчате',
        steps: [
          `Като име на получател въведете името си и кода в скоби: „${recipient}".`,
          `Като адрес въведете: ${addrLine}, ${HUB_ADDRESS.country}.`,
          'Готово — щом пратката пристигне при нас, я изпращаме до България.',
        ],
        warn: `Важно: кодът ${clientCode} трябва да присъства в името/адреса на пратката, за да я разпознаем веднага.`,
      }
    : {
        title: 'Your UK shopping address',
        intro: 'Order from Amazon, eBay and other UK shops to this address. When the parcel reaches us, we forward it to you in Bulgaria.',
        recipientLabel: 'Recipient name (with your code)',
        copyName: 'Copy',
        copyAll: 'Copy address',
        copied: 'Copied',
        howTitle: 'How to order',
        steps: [
          `Set the recipient name to your name plus your code in brackets: "${recipient}".`,
          `Set the address to: ${addrLine}, ${HUB_ADDRESS.country}.`,
          'Done — when the parcel reaches us, we send it on to Bulgaria.',
        ],
        warn: `Important: your code ${clientCode} must appear in the parcel name/address so we recognise it instantly.`,
      };

  return (
    <Card className="border-brand/30 bg-brand-50/30">
      <CardBody className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-brand" />
          <h3 className="font-display text-base font-bold text-foreground">{T.title}</h3>
        </div>
        <p className="text-sm leading-relaxed text-muted-fg">{T.intro}</p>

        {/* Recipient name — the critical line that carries the code */}
        <div className="rounded-xl border border-brand/30 bg-card p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-fg">{T.recipientLabel}</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="font-mono text-base font-bold text-foreground">{recipient}</span>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 gap-1.5"
              onClick={() => copy(recipient, 'name', T.copied)}
            >
              {copied === 'name' ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />} {T.copyName}
            </Button>
          </div>
        </div>

        {/* Full address block */}
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm leading-relaxed text-foreground">
              <p>c/o {HUB_ADDRESS.careOf}</p>
              <p>{HUB_ADDRESS.line1}</p>
              <p>{HUB_ADDRESS.line2}</p>
              <p>
                {HUB_ADDRESS.city} {HUB_ADDRESS.postcode}
              </p>
              <p>{HUB_ADDRESS.country}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 gap-1.5"
              onClick={() => copy(fullBlock, 'all', T.copied)}
            >
              {copied === 'all' ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />} {T.copyAll}
            </Button>
          </div>
        </div>

        {/* How to use it */}
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Info className="h-4 w-4 text-warning" /> {T.howTitle}
          </p>
          <ol className="mt-2 space-y-1.5 text-sm text-foreground/80">
            {T.steps.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-semibold text-brand-700">{i + 1}.</span> {s}
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs font-medium text-foreground/80">{T.warn}</p>
        </div>
      </CardBody>
    </Card>
  );
}
