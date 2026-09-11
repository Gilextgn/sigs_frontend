import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '@/shared/components/Modal';
import { Field, inputClass } from '@/shared/components/Field';
import {
  useCreateUser,
  usePermissionsCatalog,
  useRoles,
  useUpdateUser,
  useUserDetail,
  type UserRow,
} from './useUsers';

export function UserFormModal({ editing, onClose }: { editing: UserRow | null; onClose: () => void }) {
  const { data: roles } = useRoles();
  const { data: permissionsCatalog } = usePermissionsCatalog();
  const { data: userDetail } = useUserDetail(editing?.id ?? null);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const [form, setForm] = useState({
    full_name: editing?.full_name ?? '',
    email: editing?.email ?? '',
    password: '',
    phone: editing?.phone ?? '',
    role_id: editing?.role?.id ?? '',
    status: editing?.status ?? 'active',
  });
  const [permissions, setPermissions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isSaving = createUser.isPending || updateUser.isPending;

  // Pré-remplit les permissions individuelles cochées une fois le détail chargé
  useEffect(() => {
    if (userDetail) setPermissions(userDetail.permission_overrides);
  }, [userDetail]);

  const rolePermissionCodes = roles?.find((r) => r.id === Number(form.role_id))?.permissions.map((p) => p.code) ?? [];

  function togglePermission(code: string) {
    setPermissions((current) =>
      current.includes(code) ? current.filter((c) => c !== code) : [...current, code],
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      full_name: form.full_name,
      email: form.email,
      password: form.password || undefined,
      phone: form.phone || undefined,
      role_id: Number(form.role_id),
      status: form.status as 'active' | 'inactive' | 'locked',
      permissions,
    };

    try {
      if (editing) {
        await updateUser.mutateAsync({ id: editing.id, payload });
      } else {
        if (!payload.password) {
          setError('Le mot de passe est requis pour un nouvel utilisateur.');
          return;
        }
        await createUser.mutateAsync(payload as typeof payload & { password: string });
      }
      onClose();
    } catch {
      setError("Impossible d'enregistrer l'utilisateur (e-mail déjà utilisé ?).");
    }
  }

  return (
    <Modal title={editing ? "Modifier l'utilisateur" : 'Nouvel utilisateur'} onClose={onClose} widthClassName="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Nom complet">
            <input required value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} className={inputClass} />
          </Field>
          <Field label="E-mail">
            <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputClass} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={editing ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'}>
            <input
              type="password"
              required={!editing}
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder={editing ? 'Laisser vide pour ne pas changer' : undefined}
              className={inputClass}
            />
          </Field>
          <Field label="Téléphone">
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={inputClass} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Rôle">
            <select required value={form.role_id} onChange={(e) => setForm((f) => ({ ...f, role_id: e.target.value }))} className={inputClass}>
              <option value="" disabled>Sélectionner un rôle</option>
              {roles?.map((role) => (
                <option key={role.id} value={role.id}>{role.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Statut">
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as typeof form.status }))} className={inputClass}>
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
              <option value="locked">Verrouillé</option>
            </select>
          </Field>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">Permissions supplémentaires</p>
          <p className="mb-2 text-xs text-ink-soft">
            Le rôle sélectionné accorde déjà certaines permissions (grisées, cochées automatiquement).
            Cochez ici des droits individuels en plus.
          </p>
          <div className="grid max-h-56 grid-cols-1 sm:grid-cols-2 gap-1.5 overflow-y-auto rounded-lg border border-border bg-paper p-3">
            {permissionsCatalog?.map((perm) => {
              const fromRole = rolePermissionCodes.includes(perm.code);
              const checked = fromRole || permissions.includes(perm.code);
              return (
                <label key={perm.code} className={`flex items-center gap-2 rounded px-1.5 py-1 text-xs ${fromRole ? 'text-ink-soft' : 'text-ink'}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={fromRole}
                    onChange={() => togglePermission(perm.code)}
                    className="h-3.5 w-3.5 rounded border-border accent-primary"
                  />
                  {perm.label}
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-paper">
            Annuler
          </button>
          <button type="submit" disabled={isSaving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark disabled:opacity-60">
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
