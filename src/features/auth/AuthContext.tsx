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
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (code: string) => boolean;
  /** Compte du propriétaire de la plateforme : aucune école, uniquement la console. */
  isPlatformOwner: boolean;
  suspension: SuspensionInfo | null;
  /** Relit la session : utile après réactivation par le propriétaire. */
  recheck: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [suspension, setSuspension] = useState<SuspensionInfo | null>(null);

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await apiClient.get<CurrentUser>('/me');
      setUser(data);
      setSuspension(null);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();

    const onUnauthorized = () => setUser(null);
    const onSuspended = (event: Event) => setSuspension((event as CustomEvent<SuspensionInfo>).detail);
    window.addEventListener('auth:unauthorized', onUnauthorized);
    window.addEventListener('auth:suspended', onSuspended);
    return () => {
      window.removeEventListener('auth:unauthorized', onUnauthorized);
      window.removeEventListener('auth:suspended', onSuspended);
    };
  }, [fetchMe]);

  const login = useCallback(async (email: string, password: string) => {
    await ensureCsrfCookie();
    const { data } = await apiClient.post('/auth/login', { email, password });
    setSuspension(null);
    setUser(data.user);
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
    () => ({ user, isLoading, login, logout, hasPermission, isPlatformOwner, suspension, recheck: fetchMe }),
    [user, isLoading, login, logout, hasPermission, isPlatformOwner, suspension, fetchMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return ctx;
}
