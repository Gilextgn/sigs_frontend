import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Download, Eye, Plus, Receipt, Trash2 } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useSchoolSettings } from '@/features/settings/useSettings';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Pagination } from '@/shared/components/Pagination';
import { SkeletonTableRows } from '@/shared/components/Skeleton';
import { viewIconClass, downloadIconClass, deleteIconClass } from '@/shared/components/actionStyles';
import { usePaginatedRows } from '@/shared/hooks/usePaginatedRows';
import { downloadPaymentReceiptPdf } from '@/shared/lib/pdf';
import { toReceiptData, useDeletePayment, usePayments, type PaymentRow } from './usePayments';
import { usePaymentDesk } from './PaymentDesk';
import { PaymentDetailModal } from './PaymentDetailModal';
import { currency } from '@/shared/lib/format';


function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value));
}

export default function PaymentsPage() {
  const { hasPermission } = useAuth();
  const { openPayment, openStudent } = usePaymentDesk();
  const [detailId, setDetailId] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<PaymentRow | null>(null);

  const { data, isLoading } = usePayments();
  const { data: settings } = useSchoolSettings();
  const deletePayment = useDeletePayment();
  const { pageRows, ...pagination } = usePaginatedRows(data?.data);

  const location = useLocation();
  const navigate = useNavigate();

  // Permet au dashboard (bouton "Nouveau paiement") d'ouvrir directement le formulaire.
  useEffect(() => {
    if ((location.state as { openCreate?: boolean } | null)?.openCreate) {
      openPayment();
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate, openPayment]);

  async function handleConfirmDelete() {
    if (!toDelete) return;
    await deletePayment.mutateAsync(toDelete.id);
    setToDelete(null);
  }

  async function handleDownload(payment: PaymentRow) {
    await downloadPaymentReceiptPdf(toReceiptData(payment), settings ?? null);
  }

  return (
    <div className="space-y-4">
      {hasPermission('payments.create') && (
        <div className="flex justify-end">
          <button onClick={() => openPayment()} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary transition hover:bg-primary-dark">
            <Plus className="h-4 w-4" />
            Encaisser
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-paper text-xs font-medium tracking-wide text-ink-soft uppercase">
            <tr>
              <th className="px-4 py-3">Référence</th>
              <th className="px-4 py-3">Élève</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Lignes</th>
              <th className="px-4 py-3">Caissier</th>
              <th className="px-4 py-3 text-right">Montant</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <SkeletonTableRows columns={7} />}
            {!isLoading && (data?.data.length ?? 0) === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-14 text-center">
                  <Receipt className="mx-auto h-8 w-8 text-ink-soft" />
                  <p className="mt-2 text-sm text-ink-soft">Aucun paiement enregistré pour le moment.</p>
                </td>
              </tr>
            )}
            {pageRows.map((payment) => (
              <tr key={payment.id} className="transition hover:bg-paper">
                <td className="font-tabular px-4 py-3 whitespace-nowrap text-ink-soft">{payment.reference_code}</td>
                <td className="px-4 py-3">
                  {payment.student ? (
                    <button
                      type="button"
                      onClick={() => openStudent(payment.student!.id)}
                      className="text-left font-medium text-ink transition hover:text-primary"
                    >
                      {payment.student.first_name} {payment.student.last_name}
                      <span className="block text-xs font-normal text-ink-soft">{payment.student.school_class?.label ?? ''}</span>
                    </button>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="font-tabular px-4 py-3 whitespace-nowrap text-ink-soft">{formatDate(payment.payment_date)}</td>
                <td className="px-4 py-3">
                  <span className="block max-w-[220px] truncate text-ink-soft" title={payment.items.map((item) => item.label).join(', ')}>
                    {payment.items.map((item) => item.label).join(', ')}
                  </span>
                  {payment.is_partial && (
                    <span className="mt-0.5 inline-block rounded-full bg-gold-soft px-2 py-0.5 text-[10px] font-semibold text-gold">
                      Acompte · reste {currency.format(payment.items.reduce((sum, item) => sum + Number(item.remaining_after), 0))}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-soft">{payment.cashier?.full_name ?? '—'}</td>
                <td className="font-tabular px-4 py-3 text-right font-medium whitespace-nowrap text-success">
                  +{currency.format(Number(payment.total_paid_amount))} XOF
                </td>
                <td className="px-4 py-3">
                  {/* Actions alignées sur une seule ligne, jamais empilées */}
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setDetailId(payment.id)}
                      className={viewIconClass}
                      aria-label="Voir le détail"
                      title="Voir le détail"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDownload(payment)}
                      className={downloadIconClass}
                      aria-label="Télécharger le reçu"
                      title="Télécharger le reçu (PDF)"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    {hasPermission('payments.delete') && (
                      <button
                        onClick={() => setToDelete(payment)}
                        className={deleteIconClass}
                        aria-label="Supprimer"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <Pagination {...pagination} onPageChange={pagination.setPage} />
      </div>

      {detailId !== null && <PaymentDetailModal paymentId={detailId} onClose={() => setDetailId(null)} />}

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer ce paiement ?"
        message={
          toDelete
            ? `Le paiement ${toDelete.reference_code} sera supprimé et les montants redeviendront disponibles à l'encaissement. Cette action est irréversible.`
            : ''
        }
        confirmLabel="Supprimer"
        onConfirm={handleConfirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
