import { useState } from 'react';
import { Pencil, Trash2, UserPlus, Users2 } from 'lucide-react';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Pagination } from '@/shared/components/Pagination';
import { SkeletonTableRows } from '@/shared/components/Skeleton';
import { editIconClass, deleteIconClass } from '@/shared/components/actionStyles';
import { usePaginatedRows } from '@/shared/hooks/usePaginatedRows';
import { useDeleteTeacher, useTeachers, type TeacherRow } from './useTeachers';
import { TeacherFormModal } from './TeacherFormModal';

const currency = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

export default function TeachersPage() {
  const [status, setStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherRow | null>(null);
  const [toDelete, setToDelete] = useState<TeacherRow | null>(null);

  const { data, isLoading } = useTeachers(status);
  const deleteTeacher = useDeleteTeacher();
  const { pageRows, ...pagination } = usePaginatedRows(data?.data);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(teacher: TeacherRow) {
    setEditing(teacher);
    setModalOpen(true);
  }

  async function handleConfirmDelete() {
    if (!toDelete) return;
    await deleteTeacher.mutateAsync(toDelete.id);
    setToDelete(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full max-w-[180px] rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
          <option value="">Tous les statuts</option>
          <option value="active">Actifs</option>
          <option value="inactive">Inactifs</option>
        </select>
        <button onClick={openCreate} className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark">
          <UserPlus className="h-4 w-4" />
          Nouvel enseignant
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-paper text-xs font-medium tracking-wide text-ink-soft uppercase">
            <tr>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Matière</th>
              <th className="px-4 py-3">Téléphone</th>
              <th className="px-4 py-3 text-right">Salaire</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <SkeletonTableRows columns={6} />}
            {!isLoading && (data?.data.length ?? 0) === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-14 text-center">
                  <Users2 className="mx-auto h-8 w-8 text-ink-soft" />
                  <p className="mt-2 text-sm text-ink-soft">Aucun enseignant enregistré.</p>
                </td>
              </tr>
            )}
            {pageRows.map((teacher) => (
              <tr key={teacher.id} className="transition hover:bg-paper">
                <td className="px-4 py-3 font-medium text-ink">{teacher.full_name}</td>
                <td className="px-4 py-3 text-ink-soft">{teacher.subject ?? '—'}</td>
                <td className="font-tabular px-4 py-3 text-ink-soft">{teacher.phone ?? '—'}</td>
                <td className="font-tabular px-4 py-3 text-right text-ink">
                  {teacher.monthly_salary ? `${currency.format(Number(teacher.monthly_salary))} XOF` : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${teacher.status === 'active' ? 'bg-success-soft text-success' : 'bg-paper text-ink-soft'}`}>
                    {teacher.status === 'active' ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(teacher)} className={editIconClass} aria-label="Modifier">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => setToDelete(teacher)} className={deleteIconClass} aria-label="Supprimer">
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

      {modalOpen && <TeacherFormModal editing={editing} onClose={() => setModalOpen(false)} />}

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer cet enseignant ?"
        message={toDelete ? `${toDelete.full_name} sera définitivement supprimé.` : ''}
        confirmLabel="Supprimer"
        onConfirm={handleConfirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
