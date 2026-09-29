import { useState } from 'react';
import { Eye, GraduationCap, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { usePaymentDesk } from '@/features/payments/PaymentDesk';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Pagination } from '@/shared/components/Pagination';
import { SkeletonTableRows } from '@/shared/components/Skeleton';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { deleteIconClass, editIconClass, viewIconClass } from '@/shared/components/actionStyles';
import { usePaginatedRows } from '@/shared/hooks/usePaginatedRows';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { StudentFormModal } from './StudentFormModal';
import { STUDENT_STATUS_LABELS, STUDENT_STATUS_TONES } from './studentStatus';
import { useDeleteStudent, type StudentRow } from './useStudents';

/**
 * Liste d'élèves avec les actions Voir / Modifier / Supprimer (selon les
 * droits). Sert à la recherche globale et à la page d'une classe.
 */
export function StudentsTable({
  rows,
  isLoading,
  isError,
  showClass = true,
  emptyLabel = 'Aucun élève.',
}: {
  rows: StudentRow[];
  isLoading: boolean;
  isError: boolean;
  showClass?: boolean;
  emptyLabel?: string;
}) {
  const { hasPermission } = useAuth();
  const { openStudent } = usePaymentDesk();
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [toDelete, setToDelete] = useState<StudentRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const deleteStudent = useDeleteStudent();
  const { pageRows, ...pagination } = usePaginatedRows(rows);
  const columns = showClass ? 6 : 5;

  async function handleConfirmDelete() {
    if (!toDelete) return;
    setError(null);
    try {
      await deleteStudent.mutateAsync(toDelete.id);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Impossible de supprimer cet élève.'));
    }
    setToDelete(null);
  }

  return (
    <>
      {error && <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-paper text-xs font-medium tracking-wide text-ink-soft uppercase">
              <tr>
                <th className="px-4 py-3">Matricule</th>
                <th className="px-4 py-3">Élève</th>
                {showClass && <th className="px-4 py-3">Classe</th>}
                <th className="px-4 py-3">Tuteur</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && <SkeletonTableRows columns={columns} />}
              {isError && (
                <tr>
                  <td colSpan={columns} className="px-4 py-10 text-center text-danger">
                    Impossible de charger les élèves.
                  </td>
                </tr>
              )}
              {!isLoading && !isError && rows.length === 0 && (
                <tr>
                  <td colSpan={columns} className="px-4 py-14 text-center">
                    <GraduationCap className="mx-auto h-8 w-8 text-ink-soft" />
                    <p className="mt-2 text-sm text-ink-soft">{emptyLabel}</p>
                  </td>
                </tr>
              )}
              {pageRows.map((student) => (
                <tr key={student.id} className="transition hover:bg-paper">
                  <td className="font-tabular px-4 py-3 text-ink-soft">{student.matricule}</td>
                  <td className="px-4 py-3 font-medium text-ink">{student.full_name}</td>
                  {showClass && <td className="px-4 py-3 text-ink-soft">{student.class?.label ?? '—'}</td>}
                  <td className="px-4 py-3 text-ink-soft">{student.guardian?.full_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge label={STUDENT_STATUS_LABELS[student.status] ?? student.status} tone={STUDENT_STATUS_TONES[student.status] ?? 'primary'} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openStudent(student.id)} className={viewIconClass} aria-label="Voir" title="Voir la fiche">
                        <Eye className="h-4 w-4" />
                      </button>
                      {hasPermission('students.update') && (
                        <button onClick={() => setEditing(student)} className={editIconClass} aria-label="Modifier" title="Modifier">
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {hasPermission('students.delete') && (
                        <button onClick={() => setToDelete(student)} className={deleteIconClass} aria-label="Supprimer" title="Supprimer">
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

      {editing && <StudentFormModal editing={editing} onClose={() => setEditing(null)} />}

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer cet élève ?"
        message={toDelete ? `${toDelete.full_name} sera définitivement supprimé. S'il a des paiements enregistrés, archivez-le plutôt via son statut.` : ''}
        confirmLabel="Supprimer"
        onConfirm={handleConfirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
