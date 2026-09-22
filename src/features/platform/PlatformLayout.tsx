import { Link, NavLink, Outlet } from 'react-router-dom';
import { LogOut, Moon, ShieldCheck, Sun, UserRound } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { BrandMark } from '@/shared/components/BrandMark';
import { useTheme } from '@/shared/lib/ThemeContext';

/**
 * Cadre de la console du propriétaire : volontairement dépouillé (pas de
 * menu d'école), pour qu'on ne confonde jamais cet espace avec celui d'un
 * établissement.
 */
export function PlatformLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="sticky top-0 z-30 border-b border-sidebar-line bg-sidebar text-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/platform" className="flex items-center gap-3 text-white no-underline">
            <BrandMark size={34} />
            <div className="leading-tight">
              <p className="font-display text-[17px] font-bold tracking-tight">SIGS</p>
              <p className="text-[11px] text-sidebar-text">Console plateforme</p>
            </div>
          </Link>

          <div className="flex items-center gap-1.5">
            <span className="mr-2 hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-sidebar-text md:inline-flex">
              <ShieldCheck className="h-3.5 w-3.5 text-sidebar-accent" />
              Aucun accès aux données des écoles
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Activer le thème clair' : 'Activer le thème sombre'}
              className="grid h-9 w-9 place-items-center rounded-full text-sidebar-text transition hover:bg-white/10 hover:text-white"
            >
              {theme === 'dark' ? <Sun className="h-[17px] w-[17px]" /> : <Moon className="h-[17px] w-[17px]" />}
            </button>
            <NavLink
              to="/platform/account"
              aria-label="Mon compte"
              title="Mon compte"
              className={({ isActive }) =>
                `flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm no-underline transition hover:bg-white/10 hover:text-white ${isActive ? 'bg-white/10 text-white' : 'text-white/85'}`
              }
            >
              <UserRound className="h-4 w-4" />
              <span className="hidden max-w-[160px] truncate sm:block">{user?.full_name}</span>
            </NavLink>
            <button
              type="button"
              onClick={() => logout()}
              className="flex h-9 items-center gap-2 rounded-lg px-3 text-sm text-sidebar-text transition hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
