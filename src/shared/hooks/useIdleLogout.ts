import { useCallback, useEffect, useRef, useState } from 'react';

const IDLE_LIMIT_MS = 10 * 60 * 1000; // 10 min, aligné sur SESSION_IDLE_TIMEOUT_SECONDS du backend
const WARNING_BEFORE_MS = 60 * 1000; // avertit 1 min avant la déconnexion
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const;

interface UseIdleLogoutOptions {
  enabled: boolean;
  onTimeout: () => void;
}

/**
 * Déconnecte automatiquement l'utilisateur après une période d'inactivité,
 * avec un avertissement 1 minute avant pour lui laisser une chance de
 * rester connecté.
 */
export function useIdleLogout({ enabled, onTimeout }: UseIdleLogoutOptions) {
  const [warningVisible, setWarningVisible] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (warnTimer.current) clearTimeout(warnTimer.current);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    if (countdownInterval.current) clearInterval(countdownInterval.current);
  }, []);

  const resetTimers = useCallback(() => {
    clearTimers();
    setWarningVisible(false);
    if (!enabled) return;

    warnTimer.current = setTimeout(() => {
      setWarningVisible(true);
      setSecondsLeft(Math.round(WARNING_BEFORE_MS / 1000));
      countdownInterval.current = setInterval(() => {
        setSecondsLeft((s) => Math.max(s - 1, 0));
      }, 1000);
    }, IDLE_LIMIT_MS - WARNING_BEFORE_MS);

    logoutTimer.current = setTimeout(() => {
      clearTimers();
      onTimeout();
    }, IDLE_LIMIT_MS);
  }, [enabled, clearTimers, onTimeout]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    resetTimers();
    const handleActivity = () => {
      if (!warningVisible) resetTimers();
    };

    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, handleActivity));
    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, handleActivity));
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return {
    warningVisible,
    secondsLeft,
    stayConnected: resetTimers,
  };
}
