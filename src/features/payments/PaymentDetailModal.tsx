import { Download, Receipt } from 'lucide-react';
import { Loader } from '@/shared/components/Loader';
import { Modal } from '@/shared/components/Modal';
import { useSchoolSettings } from '@/features/settings/useSettings';
import { downloadPaymentReceiptPdf } from '@/shared/lib/pdf';
import { formatAmount, formatDate, formatNumber } from '@/shared/lib/format';
import { toReceiptData, usePaymentDetail } from './usePayments';

export function PaymentDetailModal({ paymentId, onClose }: { paymentId: number; onClose: () => void }) {
  const { data: payment, isLoading } = usePaymentDetail(paymentId);
  const { data: settings } = useSchoolSettings();

  return (
    <Modal title="Détail du paiement" onClose={onClose} widthClassName="max-w-lg">
      {isLoading || !payment ? (
        <div className="grid place-items-center py-10">
          <Loader size={48} label="" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3 rounded-lg bg-paper px-3.5 py-3">
            <div className="min-w-0">
              <p className="font-tabular text-xs text-ink-soft">{payment.reference_code}</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-ink">
                {payment.student ? `${payment.student.first_name} ${payment.student.last_name}` : '—'}
              </p>
              <p className="text-xs text-ink-soft">
                {payment.student?.matricule} · {payment.student?.school_class?.label ?? '—'}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-ink-soft">{formatDate(payment.payment_date, 'long')}</p>
              <p className="text-xs text-ink-soft">Caissier : {payment.cashier?.full_name ?? '—'}</p>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold tracking-wide text-ink-soft uppercase">Lignes réglées</p>
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {payment.items.map((item) => (
                <div key={item.id} className="px-3.5 py-2.5 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-ink">{item.label}</span>
                    <span className="font-tabular font-medium text-success">+{formatNumber(item.paid_amount)}</span>
                  </div>
                  <p className="mt-0.5 text-xs">
                    {item.line_status === 'partial' ? (
                      <span className="text-gold">
                        Acompte · {formatNumber(item.paid_to_date)} versés sur {formatNumber(item.expected_amount)} · reste{' '}
                        {formatNumber(item.remaining_after)} à ce jour du paiement
                      </span>
                    ) : (
                      <span className="text-success">Ligne soldée</span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-success-soft px-3.5 py-3">
            <span className="flex items-center gap-2 text-sm font-medium text-success">
              <Receipt className="h-4 w-4" />
              Total encaissé
            </span>
            <span className="font-tabular text-lg font-bold text-success">{formatAmount(payment.total_paid_amount)}</span>
          </div>

          <button
            type="button"
            onClick={() => downloadPaymentReceiptPdf(toReceiptData(payment), settings ?? null)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition hover:bg-primary-dark"
          >
            <Download className="h-4 w-4" />
            Télécharger le reçu (PDF)
          </button>
        </div>
      )}
    </Modal>
  );
}
