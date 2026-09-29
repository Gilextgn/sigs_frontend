import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '@/shared/components/Modal';
import { Field, inputClass } from '@/shared/components/Field';
import { PasswordField } from '@/shared/components/PasswordField';
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
    password_confirmation: '',
    phone: editing?.phone ?? '',
    role_id: editing?.role?.id ?? '',
    status: editing?.status ?? 'active',
  });
  const [permissions, setPermissions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isSaving = createUser.isPending || updateUser.isPending;

  const rolePermissionCodes = roles?.find((r) => r.id === Number(form.role_id))?.permissions.map((p) => p.code) ?? [];
  const roleKey = rolePermissionCodes.join(',');
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  // Droits réels du compte (rôle + ajouts − retraits) une fois le détail chargé ; pour un
  // nouveau compte, ou quand on change de rôle, on repart des droits du rôle.
  useEffect(() => {
    if (editing && userDetail && loadedFor === null) {
      setPermissions(userDetail.effective_permissions ?? userDetail.permission_overrides);
      setLoadedFor(String(form.role_id));
      return;
    }
    if ((!editing || loadedFor !== null) && loadedFor !== String(form.role_id) && roleKey) {
      setPermissions(roleKey.split(','));
      setLoadedFor(String(form.role_id));
    }
  }, [editing, userDetail, loadedFor, form.role_id, roleKey]);

  function togglePermission(code: string) {
    setPermissions((current) =>
      current.includes(code) ? current.filter((c) => c !== code) : [...current, code],
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // En édition, un mot de passe vide signifie "ne pas changer" : la
    // confirmation n'est alors vérifiée que si un mot de passe est saisi.
    if (form.password && form.password !== form.password_confirmation) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    const payload = {
      full_name: form.full_name,
      email: form.email,
      password: form.password || undefined,
      phone: form.phone || undefined,
      role_id: Number(form.role_id),
      status: form.status as 'active' | 'inactive' | 'locked',
      permissions,
      // La liste envoyée est complète : décocher un droit du rôle le retire à ce compte.
      permissions_mode: 'effective' as const,
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
            <PasswordField
              required={!editing}
              minLength={8}
              autoComplete="new-password"
              value={form.password}
              onChange={(value) => setForm((f) => ({ ...f, password: value }))}
              placeholder={editing ? 'Laisser vide pour ne pas changer' : undefined}
              showStrength
            />
          </Field>
          <Field
            label="Confirmer le mot de passe"
            error={
              form.password && form.password_confirmation && form.password !== form.password_confirmation
                ? 'Les deux mots de passe ne correspondent pas.'
                : undefined
            }
          >
            <PasswordField
              required={!editing}
              autoComplete="new-password"
              value={form.password_confirmation}
              onChange={(value) => setForm((f) => ({ ...f, password_confirmation: value }))}
              placeholder={editing ? 'Laisser vide pour ne pas changer' : undefined}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <p className="mb-1.5 text-sm font-medium text-ink">Droits de ce compte</p>
          <p className="mb-2 text-xs text-ink-soft">
            Cochés d'après le rôle choisi. Décochez ce que ce compte ne doit pas voir ou faire (les onglets correspondants disparaissent de son menu),
            cochez ce que vous voulez lui accorder en plus. <span className="font-medium">(rôle)</span> = accordé par défaut par le rôle.
          </p>
          <div className="grid max-h-56 grid-cols-1 sm:grid-cols-2 gap-1.5 overflow-y-auto rounded-lg border border-border bg-paper p-3">
            {permissionsCatalog?.map((perm) => {
              const fromRole = rolePermissionCodes.includes(perm.code);
              const checked = permissions.includes(perm.code);
              return (
                <label key={perm.code} className="flex items-center gap-2 rounded px-1.5 py-1 text-xs text-ink">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePermission(perm.code)}
                    className="h-3.5 w-3.5 rounded border-border accent-primary"
                  />
                  <span className={checked ? '' : 'text-ink-soft line-through'}>{perm.label}</span>
                  {fromRole && <span className="text-[10px] text-ink-muted">(rôle)</span>}
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-paper">
            Annuler
          </button>
          <button type="submit" disabled={isSaving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary transition hover:bg-primary-dark disabled:opacity-60">
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
