import { Spinner } from '@/shared/components/Loader';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockKeyhole, Mail, Moon, Sun } from 'lucide-react';
import { BrandMark } from '@/shared/components/BrandMark';
import { useTheme } from '@/shared/lib/ThemeContext';
import { useAuth } from './AuthContext';
import { LoginCarousel } from './LoginCarousel';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { PasswordField } from '@/shared/components/PasswordField';

// Dépose tes photos dans public/images/login-carousel/ (voir README.md du dossier).
// Les fichiers absents sont simplement ignorés par le navigateur.
const CAROUSEL_IMAGES = [
  '/images/login-carousel/bg1sigs.jpg',
  '/images/login-carousel/logoSigs.jpg',
  '/images/login-carousel/maternelle.jpg',
  '/images/login-carousel/gradueted_students.jpg',
  '/images/login-carousel/professeure.jpg',
  '/images/login-carousel/meuf.jpg',
  '/images/login-carousel/school1.jpg',
];

export default function LoginPage() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      // Affiche la vraie cause (CORS, session, mot de passe, throttle...)
      // au lieu d'un message générique qui masquerait le problème réel.
      setError(getApiErrorMessage(err, 'Identifiants invalides. Vérifiez votre e-mail et votre mot de passe.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <LoginCarousel images={CAROUSEL_IMAGES} />

      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Activer le thème clair' : 'Activer le thème sombre'}
        className="absolute top-4 right-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-surface/90 text-ink shadow-lg backdrop-blur transition hover:text-primary"
      >
        {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
      </button>

      <div className="relative z-10 grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-2xl shadow-2xl md:grid-cols-2">
        {/* Volet gauche : identité, visible sur desktop, sur fond carrousel */}
        <div className="hidden flex-col justify-between p-10 text-white md:flex">
          <div className="flex items-center gap-3 font-display text-xl font-bold">
            <BrandMark size={40} />
            SIGS
          </div>
          <div className="space-y-3">
            <p className="font-display text-3xl leading-tight font-medium">
              Le registre de votre école,<br />enfin centralisé.
            </p>
            <p className="max-w-sm text-sm text-white/80">
              Élèves, classes, paiements et débiteurs réunis dans un seul
              tableau de bord, pensé pour aller vite.
            </p>
          </div>
        </div>

        {/* Carte de connexion */}
        <div className="flex flex-col justify-center bg-surface px-8 py-12 sm:px-12">
          <div className="mb-8 flex items-center gap-2.5 font-display text-lg font-bold text-ink md:hidden">
            <BrandMark size={34} />
            SIGS
          </div>

          <h1 className="font-display text-2xl font-semibold text-ink">Connexion</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Accédez à votre espace de gestion.
          </p>

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
                <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-soft" />
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
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-on-primary transition hover:bg-primary-dark disabled:opacity-60"
            >
              {isSubmitting ? <Spinner /> : null}
              Se connecter
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
