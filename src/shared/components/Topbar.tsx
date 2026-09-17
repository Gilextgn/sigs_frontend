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
  HandCoins,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/shared/lib/ThemeContext';
import { useActiveYear, useTopDebtors } from '@/features/dashboard/useDashboardData';
import { usePaymentDesk } from '@/features/payments/PaymentDesk';
import { GlobalSearch } from './GlobalSearch';
import { formatNumber } from '@/shared/lib/format';
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

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const { hasPermission } = useAuth();
  const { openPayment, openStudent, canPay } = usePaymentDesk();
  const { data: activeYear } = useActiveYear();
  const { data: debtors } = useTopDebtors(hasPermission('dashboard.view'));
  const notifItems = debtors?.items ?? [];
  const debtorsCount = debtors?.debtors_count ?? 0;

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
                  <li key={`${crumb.label}-${index}`} className={`items-center gap-1.5 ${isLast ? 'flex' : 'hidden sm:flex'}`}>
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
          <GlobalSearch />

          {activeYear && (
            <span
              title={activeYear.closed_at ? 'Année en cours, clôturée' : 'Année en cours'}
              className="hidden items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-ink-soft lg:inline-flex"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${activeYear.closed_at ? 'bg-ink-muted' : 'bg-primary'}`} />
              <span className="font-tabular">{activeYear.code}</span>
            </span>
          )}

          {canPay && (
            <button
              type="button"
              onClick={() => openPayment()}
              className="flex h-9 items-center gap-2 rounded-lg bg-primary px-2.5 text-sm font-semibold text-on-primary transition hover:bg-primary-dark sm:px-3.5"
              aria-label="Encaisser un paiement"
            >
              <HandCoins className="h-4 w-4" />
              <span className="hidden sm:inline">Encaisser</span>
            </button>
          )}

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
              {debtorsCount > 0 && (
                <span className="absolute top-0.5 right-0.5 grid h-4 min-w-4 place-items-center rounded-full border-2 border-surface bg-danger px-0.5 text-[9px] font-bold text-on-danger">
                  {debtorsCount > 99 ? '99+' : debtorsCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-[calc(100%+10px)] z-40 w-80 max-w-[calc(100vw-32px)] origin-top-right overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl animate-[dropdown-in_0.15s_ease-out]">
                <div className="flex items-baseline justify-between gap-2 border-b border-border px-4 py-3">
                  <span className="text-[13px] font-bold text-ink">Plus gros restes à payer</span>
                  {debtors && (
                    <span className="text-[11px] text-ink-soft">
                      {debtorsCount} famille{debtorsCount > 1 ? 's' : ''} en retard
                    </span>
                  )}
                </div>
                {notifItems.length === 0 ? (
                  <p className="px-4 py-6 text-center text-[13px] text-ink-soft">Aucune alerte pour le moment.</p>
                ) : (
                  <ul className="max-h-80 space-y-0.5 overflow-y-auto p-1.5">
                    {notifItems.map((debtor) => (
                      <li key={debtor.student_id}>
                        <button
                          type="button"
                          onClick={() => {
                            setNotifOpen(false);
                            openStudent(debtor.student_id);
                          }}
                          className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-[13px] transition hover:bg-paper"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-ink">{debtor.full_name}</span>
                            <span className="block truncate text-xs text-ink-soft">{debtor.class ?? '—'}</span>
                          </span>
                          <span className="font-tabular shrink-0 font-semibold text-danger">
                            {formatNumber(debtor.outstanding_amount)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {debtorsCount > notifItems.length && (
                  <Link
                    to="/debtors"
                    onClick={() => setNotifOpen(false)}
                    className="block border-t border-border px-4 py-2.5 text-center text-xs font-semibold text-primary no-underline hover:bg-paper"
                  >
                    Voir les {debtorsCount} débiteurs
                  </Link>
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
                profileOpen ? 'border-primary/40 ring-4 ring-primary/15' : 'border-transparent hover:border-border'
              }`}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-[12px] font-bold text-on-primary">
                {initials}
              </span>
              <span className="hidden flex-col items-start leading-tight sm:flex">
                <span className="max-w-[140px] truncate text-[13px] font-bold text-ink">{user?.full_name}</span>
                <span className="max-w-[140px] truncate text-[11px] font-medium text-primary opacity-80">{user?.role}</span>
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-primary/70 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-[calc(100%+10px)] z-40 w-80 max-w-[calc(100vw-32px)] origin-top-right overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl animate-[dropdown-in_0.15s_ease-out]">
                <div className="relative overflow-hidden bg-sidebar px-5 py-5">
                  <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-sidebar-accent/10" />
                  <div className="relative flex items-center gap-3.5">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-sidebar-accent/40 bg-sidebar-accent/15 text-base font-bold text-sidebar-accent">
                      {initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold text-white">{user?.full_name}</p>
                      <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold text-sidebar-text">
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
