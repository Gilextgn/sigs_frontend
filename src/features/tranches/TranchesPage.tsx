import { useMemo, useState } from 'react';
import { Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useClasses } from '@/features/classes/useClasses';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { editIconClass, deleteIconClass } from '@/shared/components/actionStyles';
import { useDeleteTranche, useTranches, type TrancheRow } from './useTranches';
import { TrancheFormModal } from './TrancheFormModal';
import { inputClass } from '@/shared/components/Field';
import { currency } from '@/shared/lib/format';


function formatDate(value: string | null) {
  if (!value) return '—';
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(year, month - 1, day));
}

export default function TranchesPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('tranches.manage');
  const [classId, setClassId] = useState<number | ''>('');
  const [modalState, setModalState] = useState<{ open: boolean; editing: TrancheRow | null }>({
    open: false,
    editing: null,
  });
  const [toDelete, setToDelete] = useState<TrancheRow | null>(null);
  const { data: classes } = useClasses();
  const { data, isLoading, isError } = useTranches(classId);
  const deleteTranche = useDeleteTranche();
  // Tranches rangées par classe, dans l'ordre des classes (ordre pédagogique), puis par échéance.
  const groups = useMemo(() => {
    const order = new Map((classes ?? []).map((c, index) => [c.id, index]));
    const byClass = new Map<number, TrancheRow[]>();
    for (const tranche of data ?? []) byClass.set(tranche.class_id, [...(byClass.get(tranche.class_id) ?? []), tranche]);
    return [...byClass.entries()]
      .sort(([a], [b]) => (order.get(a) ?? 999) - (order.get(b) ?? 999))
      .map(([id, tranches]) => {
        const schoolClass = classes?.find((c) => c.id === id);
        return {
          schoolClass,
          label: schoolClass?.label ?? tranches[0]?.school_class?.label ?? '—',
          tranches: [...tranches].sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') || a.label.localeCompare(b.label, 'fr', { numeric: true })),
          total: tranches.reduce((sum, t) => sum + Number(t.amount), 0),
        };
      });
  }, [data, classes]);

  async function handleConfirmDelete() {
    if (!toDelete) return;
    await deleteTranche.mutateAsync(toDelete.id);
    setToDelete(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : '')}
          className={`${inputClass} w-full bg-surface sm:max-w-xs`}
        >
          <option value="">Toutes les classes</option>
          {classes?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        {canManage && (
          <button
            onClick={() => setModalState({ open: true, editing: null })}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary transition hover:bg-primary-dark"
          >
            <Plus className="h-4 w-4" />
            Nouvelle tranche
          </button>
        )}
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded-xl bg-paper" />}
      {isError && <p className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">Impossible de charger les tranches.</p>}
      {!isLoading && !isError && groups.length === 0 && (
        <div className="rounded-xl border border-border bg-surface px-4 py-14 text-center">
          <Layers className="mx-auto h-8 w-8 text-ink-soft" />
          <p className="mt-2 text-sm text-ink-soft">Aucune tranche définie pour le moment.</p>
        </div>
      )}

      {/* Une carte par classe, dans l'ordre pédagogique : on lit d'un coup d'œil le découpage de chaque scolarité. */}
      <div className="space-y-4">
        {groups.map(({ schoolClass, label, tranches, total }) => {
          const tuition = Number(schoolClass?.tuition_amount ?? 0);
          const left = tuition - total;
          return (
            <section key={label} className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-paper px-4 py-2.5">
                <h3 className="font-display text-base font-semibold text-ink">{label}</h3>
                <p className="text-xs text-ink-soft">
                  {tranches.length} tranche(s) · <span className="font-tabular">{currency.format(total)}</span>
                  {schoolClass && (
                    <>
                      {' '}sur <span className="font-tabular">{currency.format(tuition)}</span> XOF
                      {left > 0 && <span className="ml-1.5 font-medium text-gold">· reste {currency.format(left)} à répartir</span>}
                    </>
                  )}
                </p>
              </div>
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-border">
                  {tranches.map((tranche) => (
                    <tr key={tranche.id} className="transition hover:bg-paper">
                      <td className="px-4 py-2.5 font-medium text-ink">{tranche.label}</td>
                      <td className="font-tabular px-4 py-2.5 text-right text-ink">{currency.format(Number(tranche.amount))} XOF</td>
                      <td className="w-40 px-4 py-2.5 text-ink-soft">{formatDate(tranche.due_date)}</td>
                      <td className="w-24 px-4 py-2.5">
                        {canManage && (
                          <div className="flex justify-end gap-1">
                            <button onClick={() => setModalState({ open: true, editing: tranche })} className={editIconClass} aria-label="Modifier">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => setToDelete(tranche)} className={deleteIconClass} aria-label="Supprimer">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}
      </div>

      {modalState.open && (
        <TrancheFormModal editing={modalState.editing} onClose={() => setModalState({ open: false, editing: null })} />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer cette tranche ?"
        message={toDelete ? `La tranche "${toDelete.label}" sera définitivement supprimée.` : ''}
        confirmLabel="Supprimer"
        onConfirm={handleConfirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
