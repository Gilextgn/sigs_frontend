import { useState } from 'react';
import { Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { useClasses } from '@/features/classes/useClasses';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Pagination } from '@/shared/components/Pagination';
import { SkeletonTableRows } from '@/shared/components/Skeleton';
import { editIconClass, deleteIconClass } from '@/shared/components/actionStyles';
import { usePaginatedRows } from '@/shared/hooks/usePaginatedRows';
import { useDeleteTranche, useTranches, type TrancheRow } from './useTranches';
import { TrancheFormModal } from './TrancheFormModal';
import { inputClass } from '@/shared/components/Field';

const currency = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

function formatDate(value: string | null) {
  if (!value) return '—';
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(year, month - 1, day));
}

export default function TranchesPage() {
  const [classId, setClassId] = useState<number | ''>('');
  const [modalState, setModalState] = useState<{ open: boolean; editing: TrancheRow | null }>({
    open: false,
    editing: null,
  });
  const [toDelete, setToDelete] = useState<TrancheRow | null>(null);
  const { data: classes } = useClasses();
  const { data, isLoading, isError } = useTranches(classId);
  const deleteTranche = useDeleteTranche();
  const { pageRows, ...pagination } = usePaginatedRows(data);

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
        <button
          onClick={() => setModalState({ open: true, editing: null })}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" />
          Nouvelle tranche
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-paper text-xs font-medium tracking-wide text-ink-soft uppercase">
            <tr>
              <th className="px-4 py-3">Classe</th>
              <th className="px-4 py-3">Tranche</th>
              <th className="px-4 py-3">Montant</th>
              <th className="px-4 py-3">Échéance</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <SkeletonTableRows columns={5} />}
            {isError && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-danger">Impossible de charger les tranches.</td></tr>
            )}
            {!isLoading && !isError && (data?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-14 text-center">
                  <Layers className="mx-auto h-8 w-8 text-ink-soft" />
                  <p className="mt-2 text-sm text-ink-soft">Aucune tranche définie pour le moment.</p>
                </td>
              </tr>
            )}
            {pageRows.map((tranche) => (
              <tr key={tranche.id} className="transition hover:bg-paper">
                <td className="px-4 py-3 text-ink-soft">{tranche.school_class?.label ?? '—'}</td>
                <td className="px-4 py-3 font-medium text-ink">{tranche.label}</td>
                <td className="font-tabular px-4 py-3 text-ink">{currency.format(Number(tranche.amount))} XOF</td>
                <td className="px-4 py-3 text-ink-soft">{formatDate(tranche.due_date)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => setModalState({ open: true, editing: tranche })}
                      className={editIconClass}
                      aria-label="Modifier"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setToDelete(tranche)}
                      className={deleteIconClass}
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <Pagination {...pagination} onPageChange={pagination.setPage} />
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
