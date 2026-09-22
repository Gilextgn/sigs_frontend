import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, KeyRound, UserRound } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { ChangePasswordForm } from '@/features/auth/ChangePasswordForm';
import { inputClass } from '@/shared/components/Field';
import { PasswordField } from '@/shared/components/PasswordField';
import { Spinner } from '@/shared/components/Loader';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { useUpdateAccount } from './usePlatform';

/** Le compte du propriétaire : son nom, son e-mail de connexion et son mot de passe. */
export default function PlatformAccountPage() {
  const { user, updateUser } = useAuth();
  const updateAccount = useUpdateAccount();
  const [form, setForm] = useState({ full_name: user?.full_name ?? '', email: user?.email ?? '', current_password: '' });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const emailChanged = !!user && form.email.trim() !== user.email;
  const dirty = !!user && (form.full_name !== user.full_name || emailChanged);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    try {
      const { user: updated } = await updateAccount.mutateAsync({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        current_password: emailChanged ? form.current_password : undefined,
      });
      updateUser(updated);
      setForm({ full_name: updated.full_name, email: updated.email, current_password: '' });
      setSaved(true);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Impossible d'enregistrer le profil."));
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link to="/platform" className="inline-flex items-center gap-1.5 text-sm text-ink-soft no-underline transition hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Établissements
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Mon compte</h1>
        <p className="mt-0.5 text-sm text-ink-soft">Le compte qui pilote la plateforme : gardez-le pour vous seul.</p>
      </div>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-ink">
          <UserRound className="h-4 w-4 text-primary" /> Profil
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>}
          {saved && (
            <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success-soft px-3 py-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> Profil enregistré.
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-sm font-medium text-ink">Nom affiché</p>
              <input required maxLength={180} value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium text-ink">E-mail de connexion</p>
              <input required type="email" maxLength={180} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputClass} />
            </div>
          </div>
          {emailChanged && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-ink">Mot de passe actuel</p>
              <PasswordField required autoComplete="current-password" value={form.current_password} onChange={(value) => setForm((f) => ({ ...f, current_password: value }))} />
              <p className="mt-1 text-xs text-ink-soft">Requis pour changer l'e-mail de connexion. Vous vous connecterez ensuite avec le nouvel e-mail.</p>
            </div>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!dirty || updateAccount.isPending}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition hover:bg-primary-dark disabled:opacity-60"
            >
              {updateAccount.isPending && <Spinner />}
              Enregistrer
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-ink">
          <KeyRound className="h-4 w-4 text-primary" /> Mot de passe
        </h2>
        <p className="mb-4 text-sm text-ink-soft">Les sessions ouvertes sur vos autres appareils seront déconnectées.</p>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
