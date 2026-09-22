import { KeyRound, LogOut } from 'lucide-react';
import { BrandMark } from '@/shared/components/BrandMark';
import { useAuth } from './AuthContext';
import { ChangePasswordForm } from './ChangePasswordForm';

/**
 * Première connexion avec un mot de passe remis par la plateforme (création
 * de l'école, réinitialisation) : l'utilisateur choisit le sien avant
 * d'accéder à quoi que ce soit. Le serveur refuse de toute façon les autres
 * requêtes tant que ce n'est pas fait.
 */
export function ForcePasswordChangeScreen() {
  const { user, logout } = useAuth();

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-sidebar px-4 py-10">
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-sidebar-accent/10 blur-3xl" />

      <section className="relative w-full max-w-md animate-[modal-in_0.4s_cubic-bezier(0.16,1,0.3,1)]">
        <div className="text-center text-white">
          <BrandMark size={44} className="mx-auto" />
          <div className="mx-auto mt-6 grid h-14 w-14 place-items-center rounded-2xl border border-sidebar-accent/30 bg-sidebar-accent/10 text-sidebar-accent">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">Choisissez votre mot de passe</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-sidebar-text">
            {user?.full_name ? `Bienvenue ${user.full_name}. ` : ''}Le mot de passe que vous avez reçu est temporaire : remplacez-le par un mot de passe connu de vous
            seul pour continuer.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-2xl">
          <ChangePasswordForm currentLabel="Mot de passe temporaire reçu" submitLabel="Enregistrer et continuer" />
        </div>

        <button
          type="button"
          onClick={() => logout()}
          className="mx-auto mt-4 flex items-center justify-center gap-2 px-4 py-2 text-sm text-sidebar-text transition hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </button>
      </section>
    </main>
  );
}
