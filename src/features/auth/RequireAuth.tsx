import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { SessionLoader } from './SessionLoader';

export function RequireAuth() {
  const { user, isLoading, serverUnreachable } = useAuth();
  const location = useLocation();

  if (isLoading || serverUnreachable) {
    return <SessionLoader />;
  }

  if (!user) {
    // On retient la page demandée : après connexion, l'utilisateur y revient.
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
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
