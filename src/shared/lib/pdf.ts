import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface LetterheadInfo {
  school_name: string;
  letterhead_url: string | null;
}

/** Charge une image distante et la convertit en data URL pour l'insérer dans le PDF. */
async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function createRectangularLetterhead(dataUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1800;
      canvas.height = 300;
      const context = canvas.getContext('2d');
      if (!context) {
        resolve(null);
        return;
      }

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);

      const scale = Math.min((canvas.width - 40) / image.width, (canvas.height - 40) / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = () => resolve(null);
    image.src = dataUrl;
  });
}

async function addLetterhead(doc: jsPDF, settings: LetterheadInfo | null): Promise<number> {
  const pageWidth = doc.internal.pageSize.getWidth();
  let cursorY = 15;

  if (settings?.letterhead_url) {
    const dataUrl = await loadImageAsDataUrl(settings.letterhead_url);
    const rectangularLetterhead = dataUrl ? await createRectangularLetterhead(dataUrl) : null;
    if (rectangularLetterhead) {
      try {
        doc.addImage(rectangularLetterhead, 'PNG', 15, cursorY, pageWidth - 30, 25, undefined, 'FAST');
        cursorY += 30;
      } catch {
        // Format d'image non supporté par jsPDF : on continue sans bloquer l'export.
      }
    }
  }

  const schoolName = settings?.school_name?.trim();
  if (schoolName && schoolName.toLocaleLowerCase('fr-FR') !== 'mon école') {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(schoolName, pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 8;
  }
  doc.setDrawColor(...EMERALD);
  doc.setLineWidth(0.5);
  doc.line(15, cursorY, pageWidth - 15, cursorY);

  return cursorY + 8;
}

const currency = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

const EMERALD: [number, number, number] = [14, 159, 110];
const INK: [number, number, number] = [16, 21, 28];
const INK_SOFT: [number, number, number] = [92, 102, 117];

function formatCurrency(value: number) {
  return currency.format(value).replace(/[\u00a0\u202f]/g, ' ');
}

export interface PaymentReceiptData {
  reference_code: string;
  payment_date: string;
  student: { matricule: string; first_name: string; last_name: string; class?: string | null } | null;
  cashier: { full_name: string } | null;
  items: {
    label: string;
    expected_amount: number;
    paid_amount: number;
    /** Cumul versé sur la ligne, ce paiement inclus. */
    paid_to_date: number;
    remaining_after: number;
  }[];
  total_paid_amount: string | number;
}

export async function downloadPaymentReceiptPdf(payment: PaymentReceiptData, settings: LetterheadInfo | null) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = await addLetterhead(doc, settings);

  const hasPartial = payment.items.some((item) => item.remaining_after > 0);

  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...INK);
  doc.text(hasPartial ? 'Reçu de paiement — acompte' : 'Reçu de paiement', 15, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const infoLines = [
    `Référence : ${payment.reference_code}`,
    `Date : ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(payment.payment_date))}`,
    `Élève : ${payment.student ? `${payment.student.first_name} ${payment.student.last_name} (${payment.student.matricule})` : '—'}`,
    `Classe : ${payment.student?.class ?? '—'}`,
    `Encaissé par : ${payment.cashier?.full_name ?? '—'}`,
  ];
  infoLines.forEach((line) => {
    doc.text(line, 15, y);
    y += 6;
  });
  y += 4;

  const remainingTotal = payment.items.reduce((sum, item) => sum + item.remaining_after, 0);

  autoTable(doc, {
    startY: y,
    head: [['Libellé', 'Montant dû', 'Déjà versé', 'Versé ce jour', 'Reste', 'Statut']],
    body: payment.items.map((item) => {
      const before = Math.max(item.paid_to_date - item.paid_amount, 0);
      return [
        item.label,
        formatCurrency(item.expected_amount),
        formatCurrency(before),
        formatCurrency(item.paid_amount),
        formatCurrency(item.remaining_after),
        item.remaining_after > 0 ? 'Acompte' : 'Soldé',
      ];
    }),
    foot: [['Total encaissé', '', '', formatCurrency(Number(payment.total_paid_amount)), formatCurrency(remainingTotal), '']],
    headStyles: { fillColor: EMERALD },
    footStyles: { fillColor: [228, 245, 238], textColor: INK, fontStyle: 'bold' },
    styles: { fontSize: 9 },
    didParseCell: (data) => {
      // Montants alignés à droite dans l'en-tête, les lignes et le total.
      if (data.column.index >= 1 && data.column.index <= 4) data.cell.styles.halign = 'right';
      if (data.section === 'body' && data.column.index === 5) {
        data.cell.styles.textColor = data.cell.raw === 'Acompte' ? [184, 121, 20] : EMERALD;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y;
  y += 10;

  doc.setFontSize(10);
  if (hasPartial) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(184, 121, 20);
    doc.text(`Reste à payer pour solder ces lignes : ${formatCurrency(remainingTotal)} XOF`, 15, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...INK_SOFT);
    doc.text('Ce reçu atteste un versement partiel (acompte). Les lignes marquées « Acompte » ne sont pas soldées.', 15, y);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...EMERALD);
    doc.text('Toutes les lignes réglées par ce paiement sont soldées.', 15, y);
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...INK_SOFT);
  doc.text('Montants en XOF. Situation arrêtée à la date du paiement.', pageWidth / 2, 287, { align: 'center' });

  doc.save(`recu-${payment.reference_code}.pdf`);
}

export interface PayrollSlipData {
  teacher_name: string;
  period: string;
  base_amount: number;
  bonus_amount: number;
  deduction_amount: number;
  net_amount: number;
  status: 'pending' | 'paid';
  sessions: Array<{
    session_date: string;
    class_label: string;
    subject_label: string;
    status: string;
    paid_minutes: number;
  }>;
}

export async function downloadPayrollSlipPdf(payroll: PayrollSlipData, settings: LetterheadInfo | null) {
  const doc = new jsPDF();
  let y = await addLetterhead(doc, settings);

  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('Fiche de paie', 15, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const infoLines = [
    `Enseignant : ${payroll.teacher_name}`,
    `Période : ${payroll.period}`,
    `Statut : ${payroll.status === 'paid' ? 'Payée' : 'En attente'}`,
  ];
  infoLines.forEach((line) => {
    doc.text(line, 15, y);
    y += 6;
  });
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Classe', 'Matière', 'Présence', 'Minutes payées']],
    body: payroll.sessions.map((session) => [
      new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(new Date(session.session_date)),
      session.class_label,
      session.subject_label,
      session.status === 'present' ? 'Présent' : session.status === 'justified' ? 'Justifié' : session.status === 'replaced' ? 'Remplacé' : session.status === 'absent' ? 'Absent' : 'Non saisi',
      `${session.paid_minutes} min`,
    ]),
    foot: [
      ['', '', '', 'Net à payer', `${formatCurrency(payroll.net_amount)} XOF`],
    ],
    headStyles: { fillColor: EMERALD },
    footStyles: { fillColor: [228, 245, 238], textColor: INK, fontStyle: 'bold' },
    styles: { fontSize: 9 },
    margin: { left: 15, right: 15 },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y;
  y += 12;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Récapitulatif', 15, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  const recap = [
    `Base : ${formatCurrency(payroll.base_amount)} XOF`,
    `Prime : ${formatCurrency(payroll.bonus_amount)} XOF`,
    `Retenue : ${formatCurrency(payroll.deduction_amount)} XOF`,
    `Net total : ${formatCurrency(payroll.net_amount)} XOF`,
  ];
  recap.forEach((line) => {
    doc.text(line, 15, y);
    y += 6;
  });

  doc.save(`fiche-paie-${payroll.teacher_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${payroll.period}.pdf`);
}

export interface DebtorRowData {
  matricule: string;
  full_name: string;
  class: string | null;
  theoretical_amount: number;
  paid_amount: number;
  outstanding_amount: number;
}

export async function downloadDebtorsListPdf(
  debtors: DebtorRowData[],
  filterLabel: string,
  settings: LetterheadInfo | null,
) {
  const doc = new jsPDF();
  let y = await addLetterhead(doc, settings);

  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('Liste des débiteurs', 15, y);
  y += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(filterLabel, 15, y);
  y += 6;

  const total = debtors.reduce((sum, d) => sum + d.outstanding_amount, 0);

  autoTable(doc, {
    startY: y + 2,
    head: [['Matricule', 'Élève', 'Classe', 'Dû', 'Payé', 'Reste']],
    body: debtors.map((d) => [
      d.matricule,
      d.full_name,
      d.class ?? '—',
      formatCurrency(d.theoretical_amount),
      formatCurrency(d.paid_amount),
      formatCurrency(d.outstanding_amount),
    ]),
    foot: [['', '', '', '', 'Total', formatCurrency(total)]],
    headStyles: { fillColor: EMERALD },
    footStyles: { fillColor: [247, 233, 227], textColor: [181, 80, 46], fontStyle: 'bold' },
    styles: { fontSize: 9 },
  });

  doc.save('liste-debiteurs.pdf');
}

export interface ReminderRowData {
  full_name: string;
  matricule: string;
  class: string;
  guardian: string;
  phone: string;
  situation: string;
}

/** Liste de relance de la rentrée : qui appeler, et pourquoi. */
export async function downloadReminderListPdf(rows: ReminderRowData[], title: string, settings: LetterheadInfo | null) {
  const doc = new jsPDF({ orientation: 'landscape' });
  let y = await addLetterhead(doc, settings);

  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...INK);
  doc.text(`${title} — familles à relancer`, 15, y);
  y += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...INK_SOFT);
  doc.text(`${rows.length} élève(s) non réinscrit(s) · édité le ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date())}`, 15, y);

  autoTable(doc, {
    startY: y + 5,
    head: [['Élève', 'Matricule', 'Classe', 'Tuteur', 'Téléphone', 'Situation', 'Suite donnée']],
    body: rows.map((r) => [r.full_name, r.matricule, r.class, r.guardian, r.phone, r.situation, '']),
    headStyles: { fillColor: EMERALD },
    styles: { fontSize: 9 },
    columnStyles: { 6: { cellWidth: 50 } },
  });

  doc.save('relances-rentree.pdf');
}
