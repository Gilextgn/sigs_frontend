import { useState } from 'react';
import { Pencil, Plus, School, Search, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Pagination } from '@/shared/components/Pagination';
import { SkeletonTableRows } from '@/shared/components/Skeleton';
import { editIconClass, deleteIconClass } from '@/shared/components/actionStyles';
import { usePaginatedRows } from '@/shared/hooks/usePaginatedRows';
import { useClasses, useDeleteClass, type SchoolClassRow } from './useClasses';
import { ClassFormModal } from './ClassFormModal';

const currency = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

export default function ClassesPage() {
  const [search, setSearch] = useState('');
  const [modalState, setModalState] = useState<{ open: boolean; editing: SchoolClassRow | null }>({
    open: false,
    editing: null,
  });
  const [toDelete, setToDelete] = useState<SchoolClassRow | null>(null);
  const { data, isLoading, isError } = useClasses(search);
  const deleteClass = useDeleteClass();
  const { pageRows, ...pagination } = usePaginatedRows(data);

  async function handleConfirmDelete() {
    if (!toDelete) return;
    await deleteClass.mutateAsync(toDelete.id);
    setToDelete(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une classe..."
            className="w-full rounded-lg border border-border bg-surface py-2 pr-3 pl-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          onClick={() => setModalState({ open: true, editing: null })}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" />
          Nouvelle classe
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-paper text-xs font-medium tracking-wide text-ink-soft uppercase">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Classe</th>
              <th className="px-4 py-3">Cycle</th>
              <th className="px-4 py-3">Scolarité</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <SkeletonTableRows columns={6} />}
            {isError && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-danger">Impossible de charger les classes.</td></tr>
            )}
            {!isLoading && !isError && (data?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-14 text-center">
                  <School className="mx-auto h-8 w-8 text-ink-soft" />
                  <p className="mt-2 text-sm text-ink-soft">Aucune classe créée pour le moment.</p>
                </td>
              </tr>
            )}
            {pageRows.map((schoolClass) => (
              <tr key={schoolClass.id} className="transition hover:bg-paper">
                <td className="font-tabular px-4 py-3 text-ink-soft">{schoolClass.code}</td>
                <td className="px-4 py-3 font-medium text-ink">{schoolClass.label}</td>
                <td className="px-4 py-3 text-ink-soft">{schoolClass.cycle?.label ?? '—'}</td>
                <td className="font-tabular px-4 py-3 text-ink">
                  {currency.format(Number(schoolClass.tuition_amount))} XOF
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      schoolClass.is_active ? 'bg-success-soft text-success' : 'bg-paper text-ink-soft'
                    }`}
                  >
                    {schoolClass.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => setModalState({ open: true, editing: schoolClass })}
                      className={editIconClass}
                      aria-label="Modifier"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setToDelete(schoolClass)}
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
        <ClassFormModal editing={modalState.editing} onClose={() => setModalState({ open: false, editing: null })} />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer cette classe ?"
        message={toDelete ? `La classe ${toDelete.label} sera définitivement supprimée.` : ''}
        confirmLabel="Supprimer"
        onConfirm={handleConfirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
