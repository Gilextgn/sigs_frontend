import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Download, Eye, Plus, Receipt, Trash2 } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useSchoolSettings } from '@/features/settings/useSettings';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Pagination } from '@/shared/components/Pagination';
import { viewIconClass, downloadIconClass, deleteIconClass } from '@/shared/components/actionStyles';
import { usePaginatedRows } from '@/shared/hooks/usePaginatedRows';
import { downloadPaymentReceiptPdf } from '@/shared/lib/pdf';
import { useDeletePayment, usePayments, type PaymentRow } from './usePayments';
import { NewPaymentModal } from './NewPaymentModal';
import { PaymentDetailModal } from './PaymentDetailModal';

const currency = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value));
}

export default function PaymentsPage() {
  const { hasPermission } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
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
      setModalOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  async function handleConfirmDelete() {
    if (!toDelete) return;
    await deletePayment.mutateAsync(toDelete.id);
    setToDelete(null);
  }

  async function handleDownload(payment: PaymentRow) {
    await downloadPaymentReceiptPdf(
      {
        reference_code: payment.reference_code,
        payment_date: payment.payment_date,
        student: payment.student,
        cashier: payment.cashier,
        items: payment.items.map((item) => ({
          label: item.item_type === 'TRANCHE' ? 'Tranche' : 'Autre frais',
          paid_amount: item.paid_amount,
        })),
        total_paid_amount: payment.total_paid_amount,
      },
      settings ?? null,
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark">
          <Plus className="h-4 w-4" />
          Nouveau paiement
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
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
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-ink-soft">Chargement...</td></tr>
            )}
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
                <td className="font-tabular px-4 py-3 text-ink-soft">{payment.reference_code}</td>
                <td className="px-4 py-3 font-medium text-ink">
                  {payment.student ? `${payment.student.first_name} ${payment.student.last_name}` : '—'}
                </td>
                <td className="font-tabular px-4 py-3 text-ink-soft">{formatDate(payment.payment_date)}</td>
                <td className="px-4 py-3 text-ink-soft">{payment.items.length} ligne(s)</td>
                <td className="px-4 py-3 text-ink-soft">{payment.cashier?.full_name ?? '—'}</td>
                <td className="font-tabular px-4 py-3 text-right font-medium text-success">
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

      {modalOpen && <NewPaymentModal onClose={() => setModalOpen(false)} />}
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
