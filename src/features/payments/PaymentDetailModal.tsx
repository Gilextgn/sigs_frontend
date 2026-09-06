import { Download, Loader2, Receipt } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { useSchoolSettings } from '@/features/settings/useSettings';
import { downloadPaymentReceiptPdf } from '@/shared/lib/pdf';
import { usePaymentDetail } from './usePayments';

const currency = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(value));
}

export function PaymentDetailModal({ paymentId, onClose }: { paymentId: number; onClose: () => void }) {
  const { data: payment, isLoading } = usePaymentDetail(paymentId);
  const { data: settings } = useSchoolSettings();

  async function handleDownload() {
    if (!payment) return;
    await downloadPaymentReceiptPdf(
      {
        reference_code: payment.reference_code,
        payment_date: payment.payment_date,
        student: payment.student
          ? { ...payment.student, class: payment.student.school_class?.label ?? null }
          : null,
        cashier: payment.cashier,
        items: payment.items.map((item) => ({
          label: item.item_type === 'TRANCHE' ? (item.tuition_installment?.label ?? 'Tranche') : (item.fee_type?.label ?? 'Autre frais'),
          paid_amount: item.paid_amount,
        })),
        total_paid_amount: payment.total_paid_amount,
      },
      settings ?? null,
    );
  }

  return (
    <Modal title="Détail du paiement" onClose={onClose} widthClassName="max-w-lg">
      {isLoading || !payment ? (
        <div className="flex items-center justify-center py-10 text-ink-soft">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3 rounded-lg bg-paper px-3.5 py-3">
            <div>
              <p className="font-tabular text-xs text-ink-soft">{payment.reference_code}</p>
              <p className="mt-0.5 text-sm font-semibold text-ink">
                {payment.student ? `${payment.student.first_name} ${payment.student.last_name}` : '—'}
              </p>
              <p className="text-xs text-ink-soft">
                {payment.student?.matricule} · {payment.student?.school_class?.label ?? '—'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-ink-soft">{formatDate(payment.payment_date)}</p>
              <p className="text-xs text-ink-soft">Caissier : {payment.cashier?.full_name ?? '—'}</p>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold tracking-wide text-ink-soft uppercase">Lignes réglées</p>
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {payment.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-3.5 py-2.5 text-sm">
                  <span className="text-ink">
                    {item.item_type === 'TRANCHE' ? (item.tuition_installment?.label ?? 'Tranche') : (item.fee_type?.label ?? 'Autre frais')}
                  </span>
                  <span className="font-tabular font-medium text-success">
                    {currency.format(Number(item.paid_amount))} XOF
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-success-soft px-3.5 py-3">
            <span className="flex items-center gap-2 text-sm font-medium text-success">
              <Receipt className="h-4 w-4" />
              Total encaissé
            </span>
            <span className="font-tabular text-lg font-bold text-success">
              {currency.format(Number(payment.total_paid_amount))} XOF
            </span>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-dark"
          >
            <Download className="h-4 w-4" />
            Télécharger le reçu (PDF)
          </button>
        </div>
      )}
    </Modal>
  );
}
