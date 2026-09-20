import { Loader } from '@/shared/components/Loader';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function RequireAuth() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <Loader />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

/** Les écrans d'un établissement : le compte plateforme n'y a pas accès et va à sa console. */
export function RequireSchool() {
  const { isPlatformOwner } = useAuth();

  return isPlatformOwner ? <Navigate to="/platform" replace /> : <Outlet />;
}

/** La console des établissements : réservée au propriétaire de la plateforme. */
export function RequirePlatform() {
  const { isPlatformOwner } = useAuth();

  return isPlatformOwner ? <Outlet /> : <Navigate to="/" replace />;
}
