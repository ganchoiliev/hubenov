/**
 * Customer-facing Hubenov QR. Encodes the parcel's tracking URL so the customer
 * can print it and stick it on a box they pack themselves — on arrival the
 * operator scans it in Inbound mode, it resolves instantly and the label
 * auto-prints. (Generated client-side with bwip-js, same lib as the labels.)
 */
import { useEffect, useState } from 'react';
import bwipjs from 'bwip-js/browser';
import { useTranslation } from 'react-i18next';
import { QrCode, Printer } from 'lucide-react';
import { Card, CardBody, Button } from '@/components/ui';

export function HubenovQr({ code }: { code: string }) {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const [url, setUrl] = useState('');

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://hubenov.delivery';
  const trackUrl = `${origin}/track?code=${encodeURIComponent(code)}`;

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      bwipjs.toCanvas(canvas, { bcid: 'qrcode', text: trackUrl, scale: 4, paddingwidth: 2, paddingheight: 2 });
      setUrl(canvas.toDataURL('image/png'));
    } catch {
      setUrl('');
    }
  }, [trackUrl]);

  const L =
    lang === 'bg'
      ? {
          title: 'QR за кутията',
          hint: 'Разпечатайте и залепете върху колета. При получаване сканираме този код и пратката се обработва автоматично.',
          print: 'Принтирай QR',
        }
      : {
          title: 'Box QR',
          hint: 'Print it and stick it on the parcel. On arrival we scan this code and the parcel is processed automatically.',
          print: 'Print QR',
        };

  const doPrint = () => {
    if (!url) return;
    const w = window.open('', '_blank', 'width=420,height=560');
    if (!w) return;
    w.document.write(
      `<html><head><title>${code}</title></head>` +
        `<body style="font-family:system-ui,sans-serif;text-align:center;padding:24px">` +
        `<img src="${url}" alt="QR ${code}" style="width:300px;height:300px"/>` +
        `<div style="font:700 22px ui-monospace,monospace;margin-top:10px">${code}</div>` +
        `<div style="margin-top:6px;font-size:13px;color:#555">Доставки Хубенов</div>` +
        `</body></html>`,
    );
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  };

  return (
    <Card className="mt-6">
      <CardBody className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-base font-bold text-foreground">
          <QrCode className="h-4 w-4 text-brand" /> {L.title}
        </h2>
        <div className="flex items-center gap-4">
          {url && (
            <img src={url} alt={`QR ${code}`} className="h-28 w-28 shrink-0 rounded-lg border border-border bg-white p-1" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-fg">{L.hint}</p>
            <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={doPrint} disabled={!url}>
              <Printer className="h-4 w-4" /> {L.print}
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
