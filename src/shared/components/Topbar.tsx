import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AlignJustify,
  Bell,
  ChevronDown,
  IdCard,
  LogOut,
  Mail,
  Menu,
  Moon,
  Repeat,
  Search,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/shared/lib/ThemeContext';
import { useTopDebtors } from '@/features/dashboard/useDashboardData';
import { ConfirmDialog } from './ConfirmDialog';
import { findBreadcrumbTrail } from './navItems';

interface TopbarProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
}

function useClickOutside(onOutside: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onOutside]);
  return ref;
}

export function Topbar({ collapsed, onToggleSidebar }: TopbarProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const { data: debtors } = useTopDebtors();
  const notifItems = (debtors ?? []).slice(0, 5);

  const notifRef = useClickOutside(() => setNotifOpen(false));
  const profileRef = useClickOutside(() => setProfileOpen(false));

  const trail = findBreadcrumbTrail(location.pathname);
  const initials = (user?.full_name ?? '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-4 shadow-sm sm:px-5">
        {/* Gauche : hamburger + fil d'Ariane */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label={collapsed ? 'Ouvrir le menu' : 'Réduire le menu'}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-soft transition hover:bg-paper hover:text-ink"
          >
            {collapsed ? <Menu className="h-[18px] w-[18px]" /> : <AlignJustify className="h-[18px] w-[18px]" />}
          </button>

          <nav aria-label="Fil d'Ariane" className="min-w-0 overflow-hidden">
            <ol className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
              {trail.map((crumb, index) => {
                const isLast = index === trail.length - 1;
                return (
                  <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                    {isLast ? (
                      <span className="max-w-[200px] truncate text-[13.5px] font-semibold text-ink sm:max-w-xs">
                        {crumb.label}
                      </span>
                    ) : crumb.path ? (
                      <Link to={crumb.path} className="text-[13px] font-medium text-ink-soft transition hover:text-primary hover:underline">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-[13px] font-medium text-ink-soft">{crumb.label}</span>
                    )}
                    {!isLast && <span className="text-ink-soft/50 text-xs">/</span>}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>

        {/* Droite : recherche, thème, notifications, profil */}
        <div className="flex shrink-0 items-center gap-1.5">
          <div className={`flex items-center overflow-hidden rounded-full transition-all ${searchOpen ? 'bg-paper ring-2 ring-primary/30' : ''}`}>
            <button
              type="button"
              onClick={() => setSearchOpen((o) => !o)}
              aria-label="Rechercher"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-soft transition hover:bg-paper hover:text-primary"
            >
              <Search className="h-[17px] w-[17px]" />
            </button>
            {searchOpen && (
              <input
                autoFocus
                type="search"
                placeholder="Rechercher..."
                className="w-40 bg-transparent py-1.5 pr-3 text-sm text-ink outline-none placeholder:text-ink-soft sm:w-56"
              />
            )}
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Activer le thème clair' : 'Activer le thème sombre'}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-soft transition hover:bg-paper hover:text-primary"
          >
            {theme === 'dark' ? <Sun className="h-[17px] w-[17px]" /> : <Moon className="h-[17px] w-[17px]" />}
          </button>

          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotifOpen((o) => !o)}
              aria-label="Notifications"
              aria-haspopup="true"
              aria-expanded={notifOpen}
              className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-soft transition hover:bg-paper hover:text-primary"
            >
              <Bell className="h-[17px] w-[17px]" />
              {notifItems.length > 0 && (
                <span className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full border-2 border-surface bg-danger px-0.5 text-[10px] font-bold text-white">
                  {notifItems.length > 9 ? '9+' : notifItems.length}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-[calc(100%+10px)] z-40 w-80 max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
                <div className="border-b border-border px-4 py-3 text-[13px] font-bold text-ink">
                  Élèves les plus débiteurs
                </div>
                {notifItems.length === 0 ? (
                  <p className="px-4 py-6 text-center text-[13px] text-ink-soft">Aucune alerte pour le moment.</p>
                ) : (
                  <ul className="max-h-80 space-y-0.5 overflow-y-auto p-1.5">
                    {notifItems.map((debtor) => (
                      <li key={debtor.student_id}>
                        <Link
                          to="/debtors"
                          onClick={() => setNotifOpen(false)}
                          className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-ink no-underline transition hover:bg-paper"
                        >
                          <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                          <span>
                            <strong>{debtor.full_name}</strong> ({debtor.class ?? '—'}) doit encore{' '}
                            {new Intl.NumberFormat('fr-FR').format(debtor.outstanding_amount)} XOF
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="mx-1 hidden h-7 w-px bg-border sm:block" />

          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((o) => !o)}
              aria-haspopup="true"
              aria-expanded={profileOpen}
              className={`flex items-center gap-2.5 rounded-full border py-1 pr-3 pl-1 transition ${
                profileOpen ? 'border-primary/40 shadow-[0_0_0_3px_rgba(43,76,126,0.15)]' : 'border-transparent hover:border-border'
              }`}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-[12px] font-bold text-white">
                {initials}
              </span>
              <span className="hidden flex-col items-start leading-tight sm:flex">
                <span className="max-w-[140px] truncate text-[13px] font-bold text-ink">{user?.full_name}</span>
                <span className="max-w-[140px] truncate text-[11px] font-medium text-primary opacity-80">{user?.role}</span>
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-primary/70 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-[calc(100%+10px)] z-40 w-80 max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
                <div className="relative overflow-hidden bg-gradient-to-br from-primary to-primary-dark px-5 py-5">
                  <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/8" />
                  <div className="relative flex items-center gap-3.5">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-white/35 bg-white/15 text-base font-extrabold text-white">
                      {initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold text-white">{user?.full_name}</p>
                      <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                        <ShieldCheck className="h-3 w-3" />
                        {user?.role}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-0.5 border-b border-border p-2.5">
                  <div className="flex items-start gap-3 rounded-lg px-2.5 py-2 transition hover:bg-paper">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                      <Mail className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <span className="block text-[10px] font-bold tracking-wide text-ink-soft uppercase">E-mail</span>
                      <span className="block truncate text-[13px] font-semibold text-ink">{user?.email}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg px-2.5 py-2 transition hover:bg-paper">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                      <IdCard className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <span className="block text-[10px] font-bold tracking-wide text-ink-soft uppercase">Permissions actives</span>
                      <span className="block truncate text-[13px] font-semibold text-ink">
                        {user?.permissions.length ?? 0} droit(s) accordé(s)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-0.5 p-2.5">
                  <button
                    type="button"
                    disabled
                    title="Un seul profil disponible"
                    className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[13.5px] font-medium text-ink-soft opacity-50"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-paper text-ink-soft">
                      <Repeat className="h-3.5 w-3.5" />
                    </span>
                    Changer de profil
                  </button>
                  <div className="my-1 h-px bg-border" />
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      setLogoutOpen(true);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[13.5px] font-semibold text-danger transition hover:bg-danger-soft"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-danger-soft text-danger">
                      <LogOut className="h-3.5 w-3.5" />
                    </span>
                    Déconnexion
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <ConfirmDialog
        open={logoutOpen}
        title="Confirmer la déconnexion"
        message="Vous allez être déconnecté de votre session. Voulez-vous continuer ?"
        confirmLabel="Se déconnecter"
        onConfirm={() => logout()}
        onCancel={() => setLogoutOpen(false)}
      />
    </>
  );
}
