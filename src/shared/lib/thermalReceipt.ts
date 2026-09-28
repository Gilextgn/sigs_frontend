import type { PaymentReceiptData } from './pdfDocuments';

/**
 * Ticket de caisse pour imprimante thermique (type pharmacie), pour les
 * parents sans connexion. Imprimé par le navigateur : toute imprimante
 * thermique installée sous Windows convient, en 58 ou 80 mm.
 *
 * Le QR code renvoie vers la page publique de vérification : le parent
 * confronte son ticket à ce que le serveur a réellement enregistré.
 */
export type ReceiptPaperWidth = 58 | 80;

const WIDTH_KEY = 'sigs.receiptPaperWidth';

/** Réglage du poste (il dépend de l'imprimante branchée), pas de l'école. */
export function getReceiptPaperWidth(): ReceiptPaperWidth {
  try {
    return localStorage.getItem(WIDTH_KEY) === '80' ? 80 : 58;
  } catch {
    return 58;
  }
}

export function setReceiptPaperWidth(width: ReceiptPaperWidth) {
  try {
    localStorage.setItem(WIDTH_KEY, String(width));
  } catch {
    // Stockage indisponible (navigation privée) : on garde 58 mm.
  }
}

export function receiptVerificationUrl(token: string) {
  return `${window.location.origin}/verifier/${token}`;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const amount = (value: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value).replace(/[  ]/g, ' ');

export async function printThermalReceipt(
  payment: PaymentReceiptData & { verification_token?: string | null; created_at?: string | null },
  settings: { school_name: string; letterhead_url: string | null } | null,
  width: ReceiptPaperWidth = getReceiptPaperWidth(),
) {
  const qr = payment.verification_token
    ? await (await import('qrcode')).toDataURL(receiptVerificationUrl(payment.verification_token), { margin: 0, width: 240 })
    : null;

  const remaining = payment.items.reduce((sum, item) => sum + item.remaining_after, 0);
  const date = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(payment.created_at ?? payment.payment_date),
  );
  const student = payment.student;
  const lines = payment.items
    .map(
      (item) => `
      <div class="row"><span>${escapeHtml(item.label)}</span><span>${amount(item.paid_amount)}</span></div>
      <div class="sub">${item.remaining_after > 0 ? `Acompte · reste ${amount(item.remaining_after)}` : 'Soldé'}</div>`,
    )
    .join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(payment.reference_code)}</title>
<style>
  @page { size: ${width}mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; width: ${width}mm; padding: 3mm ${width === 58 ? 2 : 4}mm 6mm; font: ${width === 58 ? 10 : 11.5}px/1.35 'Courier New', monospace; color: #000; }
  .c { text-align: center; }
  .b { font-weight: bold; }
  .logo { display: block; max-width: 100%; max-height: 18mm; margin: 0 auto 2mm; filter: grayscale(1); }
  .sep { border-top: 1px dashed #000; margin: 2mm 0; }
  .row { display: flex; justify-content: space-between; gap: 2mm; }
  .row span:last-child { white-space: nowrap; }
  .sub { font-size: 0.85em; padding-left: 2mm; margin-bottom: 1mm; }
  .total { font-size: 1.25em; font-weight: bold; }
  .qr { display: block; width: ${width === 58 ? 26 : 32}mm; margin: 2mm auto 1mm; }
  .small { font-size: 0.8em; }
</style></head><body>
  ${settings?.letterhead_url ? `<img class="logo" src="${escapeHtml(settings.letterhead_url)}" alt="">` : ''}
  <div class="c b">${escapeHtml(settings?.school_name ?? '')}</div>
  <div class="c">REÇU DE PAIEMENT</div>
  <div class="sep"></div>
  <div>N° ${escapeHtml(payment.reference_code)}</div>
  <div>Le ${escapeHtml(date)}</div>
  <div>Élève : ${student ? escapeHtml(`${student.first_name} ${student.last_name}`) : '—'}</div>
  <div>Matricule : ${escapeHtml(student?.matricule ?? '—')}</div>
  <div>Classe : ${escapeHtml(student?.class ?? '—')}</div>
  <div class="sep"></div>
  ${lines}
  <div class="sep"></div>
  <div class="row total"><span>TOTAL</span><span>${amount(Number(payment.total_paid_amount))} F</span></div>
  ${remaining > 0 ? `<div class="row"><span>Reste sur ces lignes</span><span>${amount(remaining)} F</span></div>` : ''}
  <div class="sep"></div>
  <div>Caissier : ${escapeHtml(payment.cashier?.full_name ?? '—')}</div>
  ${
    qr
      ? `<img class="qr" src="${qr}" alt=""><div class="c small">Scannez pour vérifier ce reçu<br>auprès de l'établissement</div>`
      : ''
  }
  <div class="sep"></div>
  <div class="c small">Merci. Conservez ce reçu.<br>Tout paiement doit donner lieu à un reçu.</div>
</body></html>`;

  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();

  // Attendre le logo avant d'imprimer, sinon il manque sur le ticket.
  await Promise.all(
    Array.from(doc.images).map((img) =>
      img.complete ? Promise.resolve() : new Promise((resolve) => { img.onload = img.onerror = resolve; }),
    ),
  );
  frame.contentWindow!.focus();
  frame.contentWindow!.print();
  setTimeout(() => frame.remove(), 1000);
}
