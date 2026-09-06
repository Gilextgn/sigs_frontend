import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiClient, ensureCsrfCookie } from '@/shared/lib/apiClient';

export interface CurrentUser {
  id: number;
  full_name: string;
  email: string;
  role: string | null;
  permissions: string[];
}

interface AuthContextValue {
  user: CurrentUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (code: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await apiClient.get<CurrentUser>('/me');
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();

    const onUnauthorized = () => setUser(null);
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, [fetchMe]);

  const login = useCallback(async (email: string, password: string) => {
    await ensureCsrfCookie();
    const { data } = await apiClient.post('/auth/login', { email, password });
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
    }
  }, []);

  const hasPermission = useCallback(
    (code: string) => user?.permissions.includes(code) ?? false,
    [user],
  );

  const value = useMemo(
    () => ({ user, isLoading, login, logout, hasPermission }),
    [user, isLoading, login, logout, hasPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return ctx;
}
