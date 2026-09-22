import { useEffect, useState } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { Loader } from '@/shared/components/Loader';
import { useAuth } from './AuthContext';

/** Au-delà de ce délai, on explique l'attente au lieu de laisser tourner l'anneau en silence. */
const SLOW_AFTER_MS = 3500;
/** Durée typique d'un réveil du serveur : sert à la barre de progression. */
const EXPECTED_WAKE_S = 50;

/**
 * Écran d'attente pendant la vérification de la session. Si le serveur dort
 * (hébergement qui se met en veille), l'attente peut durer près d'une minute :
 * on le dit, avec une progression, pour que l'utilisateur ne parte pas en
 * pensant que l'application est cassée.
 */
export function SessionLoader() {
  const { serverUnreachable, retry } = useAuth();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - started), 500);
    return () => clearInterval(timer);
  }, []);

  if (serverUnreachable) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper px-4">
        <div className="max-w-sm text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-danger-soft text-danger">
            <WifiOff className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-lg font-semibold text-ink">Le serveur ne répond pas</h1>
          <p className="mt-1 text-sm text-ink-soft">Vérifiez votre connexion internet, puis réessayez. Vos données ne sont pas perdues.</p>
          <button
            type="button"
            onClick={() => retry()}
            className="mx-auto mt-5 flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition hover:bg-primary-dark"
          >
            <RefreshCw className="h-4 w-4" /> Réessayer
          </button>
        </div>
      </div>
    );
  }

  const slow = elapsed > SLOW_AFTER_MS;
  const progress = Math.min(95, (elapsed / 1000 / EXPECTED_WAKE_S) * 100);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper px-4">
      <div className="flex max-w-xs flex-col items-center text-center">
        <Loader label={slow ? '' : 'Chargement…'} />
        {slow && (
          <div className="mt-4 w-full animate-[fade-in_0.3s_ease-out]">
            <p className="text-sm font-medium text-ink">Démarrage du serveur…</p>
            <p className="mt-1 text-xs text-ink-soft">Après une période sans activité, le premier accès peut prendre jusqu'à une minute. Restez sur cette page.</p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-track">
              <div className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
