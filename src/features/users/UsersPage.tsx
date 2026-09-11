import { useState } from 'react';
import { Pencil, Trash2, UserCog, UserPlus } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Pagination } from '@/shared/components/Pagination';
import { SkeletonTableRows } from '@/shared/components/Skeleton';
import { StatusBadge, type BadgeTone } from '@/shared/components/StatusBadge';
import { editIconClass, deleteIconClass } from '@/shared/components/actionStyles';
import { usePaginatedRows } from '@/shared/hooks/usePaginatedRows';
import { useDeleteUser, useUsers, type UserRow } from './useUsers';
import { UserFormModal } from './UserFormModal';

const STATUS_TONES: Record<string, BadgeTone> = {
  active: 'success',
  inactive: 'neutral',
  locked: 'danger',
};
const STATUS_LABELS: Record<string, string> = { active: 'Actif', inactive: 'Inactif', locked: 'Verrouillé' };

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [toDelete, setToDelete] = useState<UserRow | null>(null);

  const { data, isLoading } = useUsers();
  const deleteUser = useDeleteUser();
  const { pageRows, ...pagination } = usePaginatedRows(data?.data);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(user: UserRow) {
    setEditing(user);
    setModalOpen(true);
  }

  async function handleConfirmDelete() {
    if (!toDelete) return;
    await deleteUser.mutateAsync(toDelete.id);
    setToDelete(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark">
          <UserPlus className="h-4 w-4" />
          Nouvel utilisateur
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-paper text-xs font-medium tracking-wide text-ink-soft uppercase">
            <tr>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Rôle</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <SkeletonTableRows columns={5} />}
            {!isLoading && (data?.data.length ?? 0) === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-14 text-center">
                  <UserCog className="mx-auto h-8 w-8 text-ink-soft" />
                  <p className="mt-2 text-sm text-ink-soft">Aucun utilisateur.</p>
                </td>
              </tr>
            )}
            {pageRows.map((user) => (
              <tr key={user.id} className="transition hover:bg-paper">
                <td className="px-4 py-3 font-medium text-ink">{user.full_name}</td>
                <td className="px-4 py-3 text-ink-soft">{user.email}</td>
                <td className="px-4 py-3 text-ink-soft">{user.role?.label ?? '—'}</td>
                <td className="px-4 py-3">
                  <StatusBadge
                    tone={STATUS_TONES[user.status] ?? 'neutral'}
                    label={STATUS_LABELS[user.status] ?? user.status}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(user)} className={editIconClass} aria-label="Modifier">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setToDelete(user)}
                      disabled={user.id === currentUser?.id}
                      className={deleteIconClass}
                      aria-label="Supprimer"
                      title={user.id === currentUser?.id ? 'Vous ne pouvez pas supprimer votre propre compte' : undefined}
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

      {modalOpen && <UserFormModal editing={editing} onClose={() => setModalOpen(false)} />}

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer cet utilisateur ?"
        message={toDelete ? `${toDelete.full_name} n'aura plus accès à l'application.` : ''}
        confirmLabel="Supprimer"
        onConfirm={handleConfirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
