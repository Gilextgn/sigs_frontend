import { useCallback, useEffect, useRef, useState } from 'react';

const IDLE_LIMIT_MS = 10 * 60 * 1000; // 10 min, aligné sur SESSION_IDLE_TIMEOUT_SECONDS du backend
const WARNING_BEFORE_MS = 60 * 1000; // avertit 1 min avant la déconnexion
const TICK_MS = 1000;
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const;

interface UseIdleLogoutOptions {
  enabled: boolean;
  onTimeout: () => void;
}

/**
 * Déconnecte automatiquement l'utilisateur après une période d'inactivité,
 * avec un avertissement 1 minute avant pour lui laisser une chance de
 * rester connecté.
 *
 * On vérifie le temps écoulé par horloge murale (Date.now()) à intervalle
 * régulier plutôt que de compter sur un seul setTimeout(10 min) : sur
 * mobile, les minuteurs JS sont mis en veille quand l'app passe en arrière-
 * plan (écran verrouillé, changement d'appli), donc un setTimeout unique ne
 * se déclenche pas de façon fiable. On revérifie aussi explicitement au
 * retour au premier plan (visibilitychange) pour rattraper le temps déjà
 * écoulé pendant que l'app était suspendue.
 */
export function useIdleLogout({ enabled, onTimeout }: UseIdleLogoutOptions) {
  const [warningVisible, setWarningVisible] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.round(WARNING_BEFORE_MS / 1000));

  const lastActivityRef = useRef(Date.now());
  const warningVisibleRef = useRef(false);
  const loggedOutRef = useRef(false);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  const stayConnected = useCallback(() => {
    lastActivityRef.current = Date.now();
    loggedOutRef.current = false;
    warningVisibleRef.current = false;
    setWarningVisible(false);
    setSecondsLeft(Math.round(WARNING_BEFORE_MS / 1000));
  }, []);

  useEffect(() => {
    if (!enabled) return;

    loggedOutRef.current = false;
    lastActivityRef.current = Date.now();

    function handleActivity() {
      // Une fois l'avertissement affiché, seul le bouton "Rester connecté"
      // doit réinitialiser le minuteur : une activité passive (scroll,
      // effleurement de l'écran...) ne doit pas le faire disparaître sans
      // action explicite de l'utilisateur.
      if (warningVisibleRef.current || loggedOutRef.current) return;
      lastActivityRef.current = Date.now();
    }

    function check() {
      if (loggedOutRef.current) return;
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= IDLE_LIMIT_MS) {
        loggedOutRef.current = true;
        warningVisibleRef.current = false;
        setWarningVisible(false);
        onTimeoutRef.current();
        return;
      }

      if (elapsed >= IDLE_LIMIT_MS - WARNING_BEFORE_MS) {
        setSecondsLeft(Math.max(Math.ceil((IDLE_LIMIT_MS - elapsed) / 1000), 0));
        if (!warningVisibleRef.current) {
          warningVisibleRef.current = true;
          setWarningVisible(true);
        }
      }
    }

    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, handleActivity));
    const interval = setInterval(check, TICK_MS);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, handleActivity));
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
      clearInterval(interval);
    };
  }, [enabled]);

  return {
    warningVisible,
    secondsLeft,
    stayConnected,
  };
}
