import { useState, type FormEvent } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { PasswordField } from '@/shared/components/PasswordField';
import { Spinner } from '@/shared/components/Loader';
import { apiClient } from '@/shared/lib/apiClient';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { useAuth, type CurrentUser } from './AuthContext';

/**
 * Changement de mot de passe par l'utilisateur lui-même (PUT /auth/password).
 * Commun à la console plateforme et à l'écran de premier changement : l'ancien
 * mot de passe est toujours exigé, les autres sessions sont fermées côté serveur.
 */
export function ChangePasswordForm({ currentLabel = 'Mot de passe actuel', submitLabel = 'Changer le mot de passe' }: { currentLabel?: string; submitLabel?: string }) {
  const { updateUser } = useAuth();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  const mismatch = form.confirm.length > 0 && form.next !== form.confirm;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (mismatch) return;
    setError(null);
    setDone(false);
    setPending(true);
    try {
      const { data } = await apiClient.put<{ user: CurrentUser }>('/auth/password', {
        current_password: form.current,
        password: form.next,
        password_confirmation: form.confirm,
      });
      setForm({ current: '', next: '', confirm: '' });
      setDone(true);
      updateUser(data.user);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Impossible de changer le mot de passe.'));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>}
      {done && (
        <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success-soft px-3 py-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Mot de passe changé. Vos autres sessions ont été déconnectées.
        </div>
      )}

      <div>
        <p className="mb-1.5 text-sm font-medium text-ink">{currentLabel}</p>
        <PasswordField required autoComplete="current-password" value={form.current} onChange={(value) => setForm((f) => ({ ...f, current: value }))} />
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium text-ink">Nouveau mot de passe</p>
        <PasswordField
          required
          minLength={8}
          autoComplete="new-password"
          showStrength
          placeholder="8 caractères minimum"
          value={form.next}
          onChange={(value) => setForm((f) => ({ ...f, next: value }))}
        />
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium text-ink">Confirmer le nouveau mot de passe</p>
        <PasswordField required minLength={8} autoComplete="new-password" value={form.confirm} onChange={(value) => setForm((f) => ({ ...f, confirm: value }))} />
        {mismatch && <p className="mt-1 text-xs text-danger">Les deux mots de passe ne correspondent pas.</p>}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending || mismatch}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition hover:bg-primary-dark disabled:opacity-60"
        >
          {pending && <Spinner />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
