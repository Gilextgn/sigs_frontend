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
  doc.setDrawColor(43, 76, 126);
  doc.setLineWidth(0.5);
  doc.line(15, cursorY, pageWidth - 15, cursorY);

  return cursorY + 8;
}

const currency = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

function formatCurrency(value: number) {
  return currency.format(value).replace(/[\u00a0\u202f]/g, ' ');
}

export interface PaymentReceiptData {
  reference_code: string;
  payment_date: string;
  student: { matricule: string; first_name: string; last_name: string; class?: string | null } | null;
  cashier: { full_name: string } | null;
  items: { label: string; paid_amount: string | number }[];
  total_paid_amount: string | number;
}

export async function downloadPaymentReceiptPdf(payment: PaymentReceiptData, settings: LetterheadInfo | null) {
  const doc = new jsPDF();
  let y = await addLetterhead(doc, settings);

  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('Reçu de paiement', 15, y);
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

  autoTable(doc, {
    startY: y,
    head: [['Libellé', 'Montant payé (XOF)']],
    body: payment.items.map((item) => [item.label, formatCurrency(Number(item.paid_amount))]),
    foot: [['Total', formatCurrency(Number(payment.total_paid_amount))]],
    headStyles: { fillColor: [43, 76, 126] },
    footStyles: { fillColor: [231, 236, 246], textColor: [27, 35, 64], fontStyle: 'bold' },
    styles: { fontSize: 10 },
  });

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
    headStyles: { fillColor: [43, 76, 126] },
    footStyles: { fillColor: [231, 236, 246], textColor: [27, 35, 64], fontStyle: 'bold' },
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
    headStyles: { fillColor: [43, 76, 126] },
    footStyles: { fillColor: [247, 233, 227], textColor: [181, 80, 46], fontStyle: 'bold' },
    styles: { fontSize: 9 },
  });

  doc.save('liste-debiteurs.pdf');
}
