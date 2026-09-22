/**
 * Façade des exports PDF. jsPDF (et html2canvas qu'il entraîne) pèse plus de
 * 300 Ko : il n'est téléchargé qu'au premier PDF demandé, pas au chargement
 * de l'application — sinon chaque visiteur, même sur la page d'accueil,
 * attendrait une bibliothèque dont il ne se servira peut-être jamais.
 */
import type * as Documents from './pdfDocuments';

export type { DebtorRowData, PaymentReceiptData, PayrollSlipData, ReminderRowData, TimetableCellData, TimetableData } from './pdfDocuments';

const load = () => import('./pdfDocuments');

export async function downloadPaymentReceiptPdf(...args: Parameters<typeof Documents.downloadPaymentReceiptPdf>) {
  return (await load()).downloadPaymentReceiptPdf(...args);
}

export async function downloadPayrollSlipPdf(...args: Parameters<typeof Documents.downloadPayrollSlipPdf>) {
  return (await load()).downloadPayrollSlipPdf(...args);
}

export async function downloadDebtorsListPdf(...args: Parameters<typeof Documents.downloadDebtorsListPdf>) {
  return (await load()).downloadDebtorsListPdf(...args);
}

export async function downloadReminderListPdf(...args: Parameters<typeof Documents.downloadReminderListPdf>) {
  return (await load()).downloadReminderListPdf(...args);
}

export async function downloadTimetablePdf(...args: Parameters<typeof Documents.downloadTimetablePdf>) {
  return (await load()).downloadTimetablePdf(...args);
}
