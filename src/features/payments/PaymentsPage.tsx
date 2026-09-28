import { Fragment, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Download, Eye, Plus, Receipt, Trash2 } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useSchoolSettings } from '@/features/settings/useSettings';
import { Modal } from '@/shared/components/Modal';
import { getApiErrorMessage } from '@/shared/lib/apiError';
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
  const [deleteReason, setDeleteReason] = useState('');

  const { data, isLoading } = usePayments();
  const { data: settings } = useSchoolSettings();
  const deletePayment = useDeletePayment();
  // Une ligne par élève (le plus récent en tête) : son nom ne se répète plus à chaque versement.
  const groups = useMemo(() => {
    const byStudent = new Map<string, PaymentRow[]>();
    for (const payment of data?.data ?? []) {
      const key = String(payment.student?.id ?? `p-${payment.id}`);
      byStudent.set(key, [...(byStudent.get(key) ?? []), payment]);
    }
    return [...byStudent.entries()].map(([key, payments]) => ({
      key,
      payments,
      total: payments.reduce((sum, payment) => sum + Number(payment.total_paid_amount), 0),
    }));
  }, [data]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const { pageRows, ...pagination } = usePaginatedRows(groups);

  const location = useLocation();
  const navigate = useNavigate();

  // Permet au dashboard (bouton "Nouveau paiement") d'ouvrir directement le formulaire.
  useEffect(() => {
    if ((location.state as { openCreate?: boolean } | null)?.openCreate) {
      openPayment();
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate, openPayment]);

  function closeDelete() {
    setToDelete(null);
    setDeleteReason('');
    deletePayment.reset();
  }

  async function handleConfirmDelete(event: FormEvent) {
    event.preventDefault();
    if (!toDelete) return;
    await deletePayment.mutateAsync({ id: toDelete.id, reason: deleteReason.trim() });
    closeDelete();
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
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-paper text-xs font-medium tracking-wide text-ink-soft uppercase">
            <tr>
              <th className="px-4 py-3">Élève</th>
              <th className="px-4 py-3">Versements</th>
              <th className="px-4 py-3">Dernier paiement</th>
              <th className="px-4 py-3 text-right">Total versé</th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <SkeletonTableRows columns={5} />}
            {!isLoading && groups.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-14 text-center">
                  <Receipt className="mx-auto h-8 w-8 text-ink-soft" />
                  <p className="mt-2 text-sm text-ink-soft">Aucun paiement enregistré pour le moment.</p>
                </td>
              </tr>
            )}
            {pageRows.map((group) => {
              const open = expanded.has(group.key);
              const last = group.payments[0];
              return (
                <Fragment key={group.key}>
                  <tr className="cursor-pointer transition hover:bg-paper" onClick={() => toggle(group.key)}>
                    <td className="px-4 py-3">
                      {last.student ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openStudent(last.student!.id);
                          }}
                          className="text-left font-medium text-ink transition hover:text-primary"
                        >
                          {last.student.first_name} {last.student.last_name}
                          <span className="block text-xs font-normal text-ink-soft">{last.student.school_class?.label ?? ''}</span>
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{group.payments.length} paiement(s)</td>
                    <td className="font-tabular px-4 py-3 whitespace-nowrap text-ink-soft">{formatDate(last.payment_date)}</td>
                    <td className="font-tabular px-4 py-3 text-right font-medium whitespace-nowrap text-success">+{currency.format(group.total)} XOF</td>
                    <td className="px-4 py-3 text-right text-ink-soft">
                      <ChevronDown className={`inline h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
                    </td>
                  </tr>
                  {open &&
                    group.payments.map((payment) => (
                      <tr key={payment.id} className="bg-paper/60">
                        <td className="font-tabular py-2.5 pr-4 pl-8 text-xs whitespace-nowrap text-ink-soft">{payment.reference_code}</td>
                        <td className="px-4 py-2.5">
                          <span className="block max-w-[260px] truncate text-ink-soft" title={payment.items.map((item) => item.label).join(', ')}>
                            {payment.items.map((item) => item.label).join(', ')}
                          </span>
                          {payment.is_partial && (
                            <span className="mt-0.5 inline-block rounded-full bg-gold-soft px-2 py-0.5 text-[10px] font-semibold text-gold">
                              Acompte · reste {currency.format(payment.items.reduce((sum, item) => sum + Number(item.remaining_after), 0))}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs whitespace-nowrap text-ink-soft">
                          {formatDate(payment.payment_date)} · {payment.cashier?.full_name ?? '—'}
                        </td>
                        <td className="font-tabular px-4 py-2.5 text-right whitespace-nowrap text-ink">{currency.format(Number(payment.total_paid_amount))} XOF</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => setDetailId(payment.id)} className={viewIconClass} aria-label="Voir le détail" title="Voir le détail">
                              <Eye className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDownload(payment)} className={downloadIconClass} aria-label="Télécharger le reçu" title="Télécharger le reçu (PDF)">
                              <Download className="h-4 w-4" />
                            </button>
                            {hasPermission('payments.delete') && (
                              <button onClick={() => setToDelete(payment)} className={deleteIconClass} aria-label="Supprimer" title="Supprimer">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        </div>
        <Pagination {...pagination} onPageChange={pagination.setPage} />
      </div>

      {detailId !== null && <PaymentDetailModal paymentId={detailId} onClose={() => setDetailId(null)} />}

      {toDelete && (
        <Modal title="Supprimer ce paiement ?" onClose={closeDelete} widthClassName="max-w-sm">
          <form onSubmit={handleConfirmDelete} className="space-y-4">
            <p className="text-sm text-ink-soft">
              Le paiement {toDelete.reference_code} ({currency.format(Number(toDelete.total_paid_amount))} XOF) sera annulé et les
              montants redeviendront disponibles à l'encaissement. L'annulation figurera dans le point de caisse.
            </p>
            <label className="block text-sm">
              <span className="font-medium text-ink">Motif de l'annulation</span>
              <textarea
                value={deleteReason}
                onChange={(event) => setDeleteReason(event.target.value)}
                rows={2}
                required
                minLength={5}
                autoFocus
                placeholder="Ex. : erreur sur l'élève, montant mal saisi…"
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink"
              />
            </label>
            {deletePayment.isError && <p className="text-sm text-danger">{getApiErrorMessage(deletePayment.error)}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeDelete} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-paper">
                Annuler
              </button>
              <button
                type="submit"
                disabled={deletePayment.isPending || deleteReason.trim().length < 5}
                className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-on-danger transition hover:opacity-90 disabled:opacity-50"
              >
                Supprimer
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
