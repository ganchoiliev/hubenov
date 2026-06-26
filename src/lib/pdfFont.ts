/**
 * Unicode (Cyrillic + Latin) font embedding for pdf-lib. DejaVu Sans is subset
 * to Latin+Cyrillic and served from /public/fonts; each PDF further subsets to
 * the glyphs it uses, so output stays small. Lets invoices/labels/customs render
 * true Bulgarian instead of transliterated Latin.
 */
import type { PDFDocument, PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

let regular: Uint8Array | null = null;
let bold: Uint8Array | null = null;

async function load(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`font fetch failed: ${url} (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
}

/** Register fontkit + embed DejaVu Sans regular/bold into the doc (cached bytes). */
export async function embedUnicodeFonts(doc: PDFDocument): Promise<{ font: PDFFont; bold: PDFFont }> {
  doc.registerFontkit(fontkit as never);
  if (!regular) regular = await load('/fonts/DejaVuSans.ttf');
  if (!bold) bold = await load('/fonts/DejaVuSans-Bold.ttf');
  const font = await doc.embedFont(new Uint8Array(regular), { subset: true });
  const boldFont = await doc.embedFont(new Uint8Array(bold), { subset: true });
  return { font, bold: boldFont };
}
