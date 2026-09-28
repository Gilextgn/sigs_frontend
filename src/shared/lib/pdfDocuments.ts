import { jsPDF } from 'jspdf';
import autoTable, { type UserOptions } from 'jspdf-autotable';

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
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.5);
  doc.line(15, cursorY, pageWidth - 15, cursorY);

  return cursorY + 8;
}

const currency = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

/** Tableau au format état standard : quadrillage noir fin, en-tête noir. */
function table(doc: jsPDF, options: UserOptions) {
  autoTable(doc, {
    theme: 'grid',
    ...options,
    styles: { lineColor: [0, 0, 0], lineWidth: 0.15, textColor: [0, 0, 0], ...options.styles },
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold', ...options.headStyles },
  });
}

/** Documents officiels : noir et blanc, comme un état standard (pas de couleur de marque). */
const BLACK: [number, number, number] = [0, 0, 0];
const LIGHT: [number, number, number] = [235, 235, 235];
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
  /** Jeton du QR code de vérification (absent des anciennes réponses de l'API). */
  verification_token?: string | null;
  created_at?: string | null;
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

  table(doc, {
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
    headStyles: { fillColor: BLACK },
    footStyles: { fillColor: LIGHT, textColor: INK, fontStyle: 'bold' },
    styles: { fontSize: 9 },
    didParseCell: (data) => {
      // Montants alignés à droite dans l'en-tête, les lignes et le total.
      if (data.column.index >= 1 && data.column.index <= 4) data.cell.styles.halign = 'right';
      if (data.section === 'body' && data.column.index === 5) {
        data.cell.styles.textColor = INK;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y;
  y += 10;

  doc.setFontSize(10);
  if (hasPartial) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...INK);
    doc.text(`Reste à payer pour solder ces lignes : ${formatCurrency(remainingTotal)} XOF`, 15, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...INK_SOFT);
    doc.text('Ce reçu atteste un versement partiel (acompte). Les lignes marquées « Acompte » ne sont pas soldées.', 15, y);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLACK);
    doc.text('Toutes les lignes réglées par ce paiement sont soldées.', 15, y);
  }

  if (payment.verification_token) {
    const url = `${window.location.origin}/verifier/${payment.verification_token}`;
    const qr = await (await import('qrcode')).toDataURL(url, { margin: 0, width: 240 });
    y += 10;
    doc.addImage(qr, 'PNG', 15, y, 28, 28);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...INK_SOFT);
    doc.text(['Scannez ce code pour vérifier que ce reçu', "est bien enregistré par l'établissement."], 48, y + 12);
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

  table(doc, {
    startY: y,
    head: [['Date', 'Classe', 'Matière', 'Présence', 'Minutes payées']],
    body: payroll.sessions.map((session) => [
      new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(new Date(session.session_date)),
      session.class_label,
      session.subject_label,
      session.status === 'present' ? 'Présent' : session.status === 'late' ? 'En retard' : session.status === 'justified' ? 'Justifié' : session.status === 'replaced' ? 'Remplacé' : session.status === 'absent' ? 'Absent' : 'Non saisi',
      `${session.paid_minutes} min`,
    ]),
    foot: [
      ['', '', '', 'Net à payer', `${formatCurrency(payroll.net_amount)} XOF`],
    ],
    headStyles: { fillColor: BLACK },
    footStyles: { fillColor: LIGHT, textColor: INK, fontStyle: 'bold' },
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

  table(doc, {
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
    headStyles: { fillColor: BLACK },
    footStyles: { fillColor: LIGHT, textColor: INK, fontStyle: 'bold' },
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

  table(doc, {
    startY: y + 5,
    head: [['Élève', 'Matricule', 'Classe', 'Tuteur', 'Téléphone', 'Situation', 'Suite donnée']],
    body: rows.map((r) => [r.full_name, r.matricule, r.class, r.guardian, r.phone, r.situation, '']),
    headStyles: { fillColor: BLACK },
    styles: { fontSize: 9 },
    columnStyles: { 6: { cellWidth: 50 } },
  });

  doc.save('relances-rentree.pdf');
}

/** Sous-ensemble du rapport /cash/report nécessaire au PDF (évite une dépendance vers features/). */
export interface CashPointData {
  payment_count: number;
  total_amount: number;
  by_class: {
    class: string;
    payment_count: number;
    total_amount: number;
    students: {
      full_name: string;
      matricule: string | null;
      payments: { reference_code: string; payment_date: string; cashier: string | null; total_paid_amount: number; lines: { label: string; amount: number }[] }[];
    }[];
  }[];
  by_cashier: { full_name: string | null; payment_count: number; total_amount: number }[];
  by_line: { label: string; total_amount: number }[];
  cancellations: { reference_code: string; student: string | null; total_paid_amount: number; deleted_at: string; deleted_by: string | null; reason: string | null }[];
  closings: { closing_date: string; cashier: string | null; expected_amount: number; counted_amount: number; difference: number; reopened_at: string | null }[];
}

type AutoTableDoc = jsPDF & { lastAutoTable?: { finalY?: number } };

/**
 * Point de caisse A4 : remplace le cahier (par classe, chaque élève et
 * chaque versement), puis récapitulatifs, annulations, clôtures et zone de
 * signatures en bas de la dernière page.
 */
export async function downloadCashPointPdf(report: CashPointData, periodLabel: string, settings: LetterheadInfo | null) {
  const doc: AutoTableDoc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const shortDate = (value: string) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(new Date(value));
  let y = await addLetterhead(doc, settings);

  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...INK);
  doc.text('Point de caisse', 15, y);
  y += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...INK_SOFT);
  doc.text(`${periodLabel} · édité le ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date())}`, 15, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...INK);
  doc.text(`${report.payment_count} paiement(s) · Total encaissé : ${formatCurrency(report.total_amount)} XOF`, 15, y);

  const tableDefaults = {
    headStyles: { fillColor: BLACK },
    styles: { fontSize: 8.5, cellPadding: 1.8 },
    margin: { left: 15, right: 15 },
  };
  const next = (gap = 8) => (doc.lastAutoTable?.finalY ?? y) + gap;

  // Détail par classe, comme le cahier.
  const body: (string | { content: string; colSpan?: number; styles?: object })[][] = [];
  for (const group of report.by_class) {
    body.push([{ content: `${group.class} — ${group.payment_count} paiement(s)`, colSpan: 5, styles: { fontStyle: 'bold', fillColor: LIGHT } }]);
    for (const student of group.students) {
      student.payments.forEach((payment, index) => {
        body.push([
          index === 0 ? student.full_name : '',
          payment.reference_code,
          shortDate(payment.payment_date),
          payment.lines.map((line) => `${line.label} : ${formatCurrency(line.amount)}`).join('\n'),
          formatCurrency(payment.total_paid_amount),
        ]);
      });
    }
    body.push([{ content: `Sous-total ${group.class}`, colSpan: 4, styles: { fontStyle: 'bold', halign: 'right' } }, { content: formatCurrency(group.total_amount), styles: { fontStyle: 'bold', halign: 'right' } }]);
  }

  table(doc, {
    ...tableDefaults,
    startY: y + 5,
    head: [['Élève', 'Référence', 'Date', 'Détail', 'Montant']],
    body: body.length ? body : [[{ content: 'Aucun paiement sur la période.', colSpan: 5, styles: { halign: 'center' } }]],
    foot: [[{ content: 'Total général', colSpan: 4, styles: { halign: 'right' } }, formatCurrency(report.total_amount)]],
    footStyles: { fillColor: LIGHT, textColor: INK, fontStyle: 'bold', halign: 'right' },
    columnStyles: { 0: { cellWidth: 42 }, 1: { cellWidth: 36 }, 2: { cellWidth: 18 }, 4: { halign: 'right', cellWidth: 24 } },
  });

  if (report.by_cashier.length > 0) {
    table(doc, {
      ...tableDefaults,
      startY: next(),
      head: [['Caissier', 'Paiements', 'Montant']],
      body: report.by_cashier.map((row) => [row.full_name ?? '—', String(row.payment_count), formatCurrency(row.total_amount)]),
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    });
  }

  if (report.cancellations.length > 0) {
    table(doc, {
      ...tableDefaults,
      startY: next(),
      head: [['Paiement annulé', 'Élève', 'Montant', 'Annulé le', 'Par', 'Motif']],
      headStyles: { fillColor: BLACK },
      body: report.cancellations.map((row) => [row.reference_code, row.student ?? '—', formatCurrency(row.total_paid_amount), shortDate(row.deleted_at), row.deleted_by ?? '—', row.reason ?? '—']),
      columnStyles: { 2: { halign: 'right' } },
    });
  }

  if (report.closings.length > 0) {
    table(doc, {
      ...tableDefaults,
      startY: next(),
      head: [['Clôture', 'Caissier', 'Attendu', 'Compté', 'Écart', 'État']],
      body: report.closings.map((row) => [
        shortDate(row.closing_date),
        row.cashier ?? '—',
        formatCurrency(row.expected_amount),
        formatCurrency(row.counted_amount),
        formatCurrency(row.difference),
        row.reopened_at ? 'Rouverte' : 'Clôturée',
      ]),
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
    });
  }

  // Signatures : toujours en bas de la dernière page, sur une page neuve s'il ne reste pas la place.
  let signatureY = next(14);
  if (signatureY > pageHeight - 45) {
    doc.addPage();
    signatureY = 30;
  }
  signatureY = Math.max(signatureY, pageHeight - 50);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...INK);
  doc.text('Le/La caissier(ère)', 15, signatureY);
  doc.text('Le Directeur', pageWidth - 15, signatureY, { align: 'right' });
  doc.setDrawColor(...INK_SOFT);
  doc.setLineWidth(0.2);
  doc.line(15, signatureY + 22, 80, signatureY + 22);
  doc.line(pageWidth - 80, signatureY + 22, pageWidth - 15, signatureY + 22);

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...INK_SOFT);
    doc.text(`Point de caisse · ${periodLabel} · page ${page}/${pages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  }

  doc.save(`point-caisse-${periodLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`);
}

export interface TimetableData {
  /** Libellés des plages (« 08h00 - 09h00 »), de haut en bas. */
  slots: string[];
  days: { index: number; label: string }[];
  /** Un bloc par cours : jour (index dans days), première plage, nombre de plages, texte et couleur de la matière. */
  blocks: { day: number; row: number; span: number; text: string; color: [number, number, number] }[];
}

/**
 * Emploi du temps comme on l'affiche en classe : heures en lignes, jours en
 * colonnes, chaque cours sur toute sa durée et coloré par matière.
 */
export async function downloadTimetablePdf(timetable: TimetableData, title: string, subtitle: string, settings: LetterheadInfo | null) {
  const doc = new jsPDF({ orientation: 'landscape' });
  let y = await addLetterhead(doc, settings);

  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...INK);
  doc.text(title, 15, y);
  y += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...INK_SOFT);
  doc.text(`${subtitle} · édité le ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date())}`, 15, y);

  type Cell = string | { content: string; rowSpan?: number; styles?: object };
  const covered = new Set(timetable.blocks.flatMap((block) => Array.from({ length: block.span - 1 }, (_, i) => `${block.row + i + 1}|${block.day}`)));
  const body: Cell[][] = timetable.slots.map((slot, row) => {
    const cells: Cell[] = [slot];
    timetable.days.forEach((_, day) => {
      if (covered.has(`${row}|${day}`)) return; // cellule couverte par un cours commencé plus haut
      const block = timetable.blocks.find((candidate) => candidate.day === day && candidate.row === row);
      cells.push(block ? { content: block.text, rowSpan: block.span, styles: { fillColor: block.color, fontStyle: 'bold' } } : '');
    });
    return cells;
  });

  table(doc, {
    startY: y + 5,
    head: [['Horaire', ...timetable.days.map((day) => day.label)]],
    body,
    headStyles: { halign: 'center' },
    styles: { fontSize: 9, valign: 'middle', halign: 'center', cellPadding: 2.5, minCellHeight: 9 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 30, fillColor: [255, 255, 255] } },
  });

  doc.save('emploi-du-temps.pdf');
}

export interface TeacherAnnualSummaryData {
  teacher: { full_name: string; pay_mode: string };
  school_year: string;
  months: { period: string; worked_hours: number; base_amount: number | null; bonus_amount: number | null; deduction_amount: number | null; net_amount: number | null; status: string; paid_at: string | null }[];
  totals: { worked_hours: number; net_amount: number; paid_amount: number; pending_amount: number };
}

/** Récapitulatif de l'année pour un enseignant : un mois par ligne, totaux, signatures. */
export async function downloadTeacherAnnualSummaryPdf(summary: TeacherAnnualSummaryData, settings: LetterheadInfo | null) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = await addLetterhead(doc, settings);
  const month = (period: string) => new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(`${period}-01T00:00:00`));
  const money = (value: number | null) => (value === null ? '—' : formatCurrency(value));
  const status = (value: string) => (value === 'paid' ? 'Payé' : value === 'pending' ? 'À payer' : 'Non établi');

  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...INK);
  doc.text(`Récapitulatif de paie — année ${summary.school_year}`, 15, y);
  y += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Enseignant : ${summary.teacher.full_name} · ${summary.teacher.pay_mode === 'monthly' ? 'salaire fixe' : 'payé à l’heure'}`, 15, y);

  table(doc, {
    startY: y + 5,
    head: [['Mois', 'Heures faites', 'Base', 'Prime', 'Retenue', 'Net', 'Statut']],
    body: summary.months.map((row) => [
      month(row.period),
      row.worked_hours.toLocaleString('fr-FR'),
      money(row.base_amount),
      money(row.bonus_amount),
      money(row.deduction_amount),
      money(row.net_amount),
      status(row.status) + (row.paid_at ? ` le ${new Intl.DateTimeFormat('fr-FR').format(new Date(row.paid_at))}` : ''),
    ]),
    foot: [['Total', summary.totals.worked_hours.toLocaleString('fr-FR'), '', '', '', formatCurrency(summary.totals.net_amount), '']],
    footStyles: { fillColor: LIGHT, textColor: INK, fontStyle: 'bold' },
    styles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
  });

  let endY = ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y) + 8;
  doc.setFontSize(10);
  doc.text(`Déjà payé : ${formatCurrency(summary.totals.paid_amount)} XOF · Reste à payer : ${formatCurrency(summary.totals.pending_amount)} XOF`, 15, endY);

  endY = Math.max(endY + 20, pageHeight - 50);
  if (endY > pageHeight - 30) {
    doc.addPage();
    endY = 30;
  }
  doc.setFont('helvetica', 'bold');
  doc.text("L'enseignant", 15, endY);
  doc.text('Le Directeur', pageWidth - 15, endY, { align: 'right' });
  doc.setLineWidth(0.2);
  doc.line(15, endY + 22, 80, endY + 22);
  doc.line(pageWidth - 80, endY + 22, pageWidth - 15, endY + 22);

  doc.save(`recap-paie-${summary.school_year}-${summary.teacher.full_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`);
}

export interface ReminderLetterData {
  full_name: string;
  matricule: string;
  class: string | null;
  guardian: string | null;
  message: string;
  items: { label: string; remaining: number; due_date: string }[];
  total: number;
}

/**
 * Avis de relance papier, à remettre aux élèves : deux avis par feuille A4
 * (on coupe au pointillé), en noir et blanc, avec l'en-tête de l'école, le
 * message du directeur, les tranches dues et la signature.
 */
export async function downloadReminderLettersPdf(letters: ReminderLetterData[], settings: LetterheadInfo | null) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const half = doc.internal.pageSize.getHeight() / 2;
  const shortDate = (value: string) => new Intl.DateTimeFormat('fr-FR').format(new Date(`${value}T00:00:00`));
  const today = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date());
  // L'en-tête est chargé une fois, puis reproduit sur chaque avis.
  const letterheadData = settings?.letterhead_url ? await loadImageAsDataUrl(settings.letterhead_url) : null;
  const letterhead = letterheadData ? await createRectangularLetterhead(letterheadData) : null;

  letters.forEach((letter, index) => {
    const top = index % 2 === 0 ? 0 : half;
    if (index > 0 && index % 2 === 0) doc.addPage();
    let y = top + 10;

    if (letterhead) {
      try {
        doc.addImage(letterhead, 'PNG', 15, y, pageWidth - 30, 18, undefined, 'FAST');
        y += 21;
      } catch {
        // Image non prise en charge : l'avis reste lisible sans en-tête.
      }
    }
    const schoolName = settings?.school_name?.trim();
    if (!letterhead && schoolName) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...INK);
      doc.text(schoolName, pageWidth / 2, y + 4, { align: 'center' });
      y += 9;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...INK);
    doc.text('AVIS DE RELANCE — FRAIS DE SCOLARITÉ', 15, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Le ${today}`, pageWidth - 15, y + 4, { align: 'right' });
    y += 9;
    doc.text(`Élève : ${letter.full_name} (${letter.matricule}) · Classe : ${letter.class ?? '—'}`, 15, y);
    y += 5;
    doc.text(`À l'attention de : ${letter.guardian ?? 'Madame, Monsieur'}`, 15, y);
    y += 6;

    // Le message du directeur, sans la liste des tranches (reprise dans le tableau).
    const body = letter.message.split('\n').filter((line) => !line.trim().startsWith('- ')).join('\n');
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(body, pageWidth - 30);
    doc.text(lines, 15, y);
    y += lines.length * 4 + 2;

    table(doc, {
      startY: y,
      margin: { left: 15, right: 15 },
      head: [['Tranche', 'Échéance', 'Reste à payer']],
      body: letter.items.map((item) => [item.label, shortDate(item.due_date), `${formatCurrency(item.remaining)} XOF`]),
      foot: [['Total', '', `${formatCurrency(letter.total)} XOF`]],
      footStyles: { fillColor: LIGHT, textColor: INK, fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 1.5 },
      columnStyles: { 2: { halign: 'right' } },
      pageBreak: 'avoid',
    });

    const signY = Math.min(((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y) + 8, top + half - 22);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Le Directeur', pageWidth - 15, signY, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setLineWidth(0.2);
    doc.line(pageWidth - 70, signY + 13, pageWidth - 15, signY + 13);

    // Pointillé de découpe entre les deux avis d'une feuille.
    if (index % 2 === 0) {
      doc.setLineDashPattern([2, 2], 0);
      doc.line(10, half, pageWidth - 10, half);
      doc.setLineDashPattern([], 0);
    }
  });

  doc.save(`avis-relance-${new Date().toISOString().slice(0, 10)}.pdf`);
}
