import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiClient, ensureCsrfCookie } from '@/shared/lib/apiClient';

export interface CurrentSchool {
  id: number;
  name: string;
  /** overdue : échéance dépassée mais l'accès fonctionne encore. */
  status: 'active' | 'overdue';
  subscription_due_at: string | null;
  /** Date de suspension automatique prévue, s'il y en a une. */
  blocked_from: string | null;
}

export interface CurrentUser {
  id: number;
  full_name: string;
  email: string;
  role: string | null;
  permissions: string[];
  /** Absent pour le propriétaire de la plateforme. */
  school: CurrentSchool | null;
  /** Mot de passe temporaire remis par la plateforme : à remplacer avant tout. */
  must_change_password?: boolean;
}

export interface SuspensionInfo {
  school_name: string | null;
  message: string;
  kind: 'manual' | 'payment' | null;
  reason: string | null;
  support_whatsapp: string | null;
}

/** Vrai si l'erreur vient d'un établissement suspendu ; renvoie alors ses détails. */
export function suspensionFromError(error: unknown): SuspensionInfo | null {
  const response = (error as { response?: { status?: number; data?: { code?: string } & Partial<SuspensionInfo> } })?.response;
  if (response?.status === 403 && response.data?.code === 'school_suspended') {
    return response.data as SuspensionInfo;
  }
  return null;
}

interface AuthContextValue {
  user: CurrentUser | null;
  /** La session est en cours de vérification (le serveur peut être en train de se réveiller). */
  isLoading: boolean;
  /** Une session était ouverte sur ce navigateur lors de la dernière visite. */
  hadSession: boolean;
  /** Le serveur n'a pas répondu malgré les réessais. */
  serverUnreachable: boolean;
  /** Relance la vérification de session après un échec réseau. */
  retry: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (code: string) => boolean;
  /** Compte du propriétaire de la plateforme : aucune école, uniquement la console. */
  isPlatformOwner: boolean;
  suspension: SuspensionInfo | null;
  /** Relit la session : utile après réactivation par le propriétaire. */
  recheck: () => Promise<void>;
  /** Remplace l'utilisateur courant par celui renvoyé après un changement de profil ou de mot de passe. */
  updateUser: (user: CurrentUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Indice « une session était ouverte sur ce navigateur ». Il permet
 * d'afficher la page d'accueil publique sans attendre le serveur (qui peut
 * mettre une minute à se réveiller) quand personne n'était connecté.
 */
const SESSION_HINT_KEY = 'sigs:session';

function readSessionHint(): boolean {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

function writeSessionHint(active: boolean) {
  try {
    if (active) localStorage.setItem(SESSION_HINT_KEY, '1');
    else localStorage.removeItem(SESSION_HINT_KEY);
  } catch {
    // Stockage indisponible (navigation privée) : on attendra simplement le serveur.
  }
}

/** Réessais de /me tant que le serveur se réveille : environ 2 minutes au total. */
const ME_RETRY_DELAYS_MS = [2000, 3000, 5000, 8000, 10000, 10000, 15000, 15000, 15000, 20000];
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [serverUnreachable, setServerUnreachable] = useState(false);
  const [suspension, setSuspension] = useState<SuspensionInfo | null>(null);
  const [hadSession] = useState(readSessionHint);

  const fetchMe = useCallback(async () => {
    setServerUnreachable(false);
    for (let attempt = 0; ; attempt++) {
      try {
        const { data } = await apiClient.get<CurrentUser>('/me', { timeout: 30_000 });
        setUser(data);
        setSuspension(null);
        writeSessionHint(true);
        break;
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        // Serveur endormi (Render) : pas de réponse, délai dépassé ou 502/503
        // pendant le démarrage. Ce n'est PAS une déconnexion : on réessaie,
        // au lieu de renvoyer à tort l'utilisateur vers la page de connexion.
        const serverWaking = status === undefined || status >= 500;
        if (serverWaking && attempt < ME_RETRY_DELAYS_MS.length) {
          await sleep(ME_RETRY_DELAYS_MS[attempt]);
          continue;
        }
        if (serverWaking) {
          setServerUnreachable(true);
        } else {
          setUser(null);
          if (status === 401 || status === 419) writeSessionHint(false);
        }
        break;
      }
    }
    setIsLoading(false);
  }, []);

  const retry = useCallback(async () => {
    setIsLoading(true);
    await fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    fetchMe();

    const onUnauthorized = () => {
      writeSessionHint(false);
      setUser(null);
    };
    const onSuspended = (event: Event) => setSuspension((event as CustomEvent<SuspensionInfo>).detail);
    window.addEventListener('auth:unauthorized', onUnauthorized);
    // Mot de passe réinitialisé par la plateforme pendant une session ouverte.
    const onPasswordRequired = () => setUser((current) => (current ? { ...current, must_change_password: true } : current));
    window.addEventListener('auth:suspended', onSuspended);
    window.addEventListener('auth:password-required', onPasswordRequired);
    return () => {
      window.removeEventListener('auth:unauthorized', onUnauthorized);
      window.removeEventListener('auth:suspended', onSuspended);
      window.removeEventListener('auth:password-required', onPasswordRequired);
    };
  }, [fetchMe]);

  const login = useCallback(async (email: string, password: string) => {
    await ensureCsrfCookie();
    const { data } = await apiClient.post('/auth/login', { email, password });
    setSuspension(null);
    setServerUnreachable(false);
    setUser(data.user);
    writeSessionHint(true);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // La session côté serveur peut déjà être expirée (ex. déconnexion
      // automatique après inactivité) : la requête échoue alors avec un
      // 401/419, mais l'utilisateur doit malgré tout être déconnecté
      // localement pour être redirigé vers /login (voir RequireAuth).
    } finally {
      writeSessionHint(false);
      setUser(null);
      setSuspension(null);
    }
  }, []);

  const hasPermission = useCallback(
    (code: string) => user?.permissions.includes(code) ?? false,
    [user],
  );

  const isPlatformOwner = !!user && user.school === null && user.permissions.includes('platform.manage');

  const value = useMemo(
    () => ({
      user,
      isLoading,
      hadSession,
      serverUnreachable,
      retry,
      login,
      logout,
      hasPermission,
      isPlatformOwner,
      suspension,
      recheck: fetchMe,
      updateUser: setUser,
    }),
    [user, isLoading, hadSession, serverUnreachable, retry, login, logout, hasPermission, isPlatformOwner, suspension, fetchMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return ctx;
}
