import { Spinner } from '@/shared/components/Loader';
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LockKeyhole, Mail, Moon, ShieldCheck, Sun } from 'lucide-react';
import { BrandMark } from '@/shared/components/BrandMark';
import { useTheme } from '@/shared/lib/ThemeContext';
import { useAuth } from './AuthContext';
import { LoginShowcase } from './LoginShowcase';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { PasswordField } from '@/shared/components/PasswordField';

export default function LoginPage() {
  const { login, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slowSubmit, setSlowSubmit] = useState(false);

  // Page demandée avant la redirection vers la connexion (voir RequireAuth).
  const from = (location.state as { from?: string } | null)?.from;
  const destination = from && from !== '/login' ? from : '/';

  // Déjà connecté (ou session retrouvée en arrière-plan) : direction la page voulue.
  if (user) {
    return <Navigate to={destination} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const slowTimer = setTimeout(() => setSlowSubmit(true), 4000);
    try {
      await login(email, password);
      navigate(destination, { replace: true });
    } catch (err) {
      // Affiche la vraie cause (CORS, session, mot de passe, throttle...)
      // au lieu d'un message générique qui masquerait le problème réel.
      setError(getApiErrorMessage(err, 'Identifiants invalides. Vérifiez votre e-mail et votre mot de passe.'));
    } finally {
      clearTimeout(slowTimer);
      setSlowSubmit(false);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10 sm:px-6 lg:justify-end lg:pr-[7vw] xl:pr-[9vw]">
      <LoginShowcase />

      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Activer le thème clair' : 'Activer le thème sombre'}
        className="absolute top-4 right-4 z-20 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
      >
        {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
      </button>

      {/* Marque, en haut à gauche de la scène */}
      <div className="absolute top-5 left-5 z-10 flex items-center gap-3 text-white sm:top-7 sm:left-8">
        <BrandMark size={40} />
        <span className="font-display text-xl font-bold tracking-tight">SIGS</span>
      </div>

      <div className="relative z-10 w-full max-w-[440px] animate-[card-in_0.8s_cubic-bezier(0.16,1,0.3,1)_both]">
        <div className="rounded-3xl border border-white/15 bg-surface/95 p-8 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.7)] backdrop-blur-2xl sm:p-10">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Bon retour</h1>
          <p className="mt-1 text-sm text-ink-soft">Connectez-vous à l'espace de votre établissement.</p>

          {error && (
            <div className="mt-6 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
                Adresse e-mail
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@ecole.com"
                  className="w-full rounded-lg border border-border bg-paper py-2.5 pr-3 pl-10 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
                Mot de passe
              </label>
              <PasswordField
                id="password"
                value={password}
                onChange={setPassword}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                leftIcon={LockKeyhole}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-on-primary transition hover:bg-primary-dark disabled:opacity-60"
            >
              {isSubmitting ? <Spinner /> : null}
              {slowSubmit ? 'Démarrage du serveur…' : 'Se connecter'}
            </button>
            {slowSubmit && (
              <p className="text-center text-xs text-ink-soft">
                Premier accès après une pause : cela peut prendre jusqu'à une minute. Ne fermez pas la page.
              </p>
            )}
          </form>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-ink-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Connexion sécurisée · données chiffrées
          </p>
        </div>
      </div>
    </div>
  );
}
