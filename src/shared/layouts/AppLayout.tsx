import { useEffect, useState, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { AlertTriangle, Clock, Eye } from 'lucide-react';
import { Sidebar } from '@/shared/components/Sidebar';
import { Topbar } from '@/shared/components/Topbar';
import { AppFooter } from '@/shared/components/AppFooter';
import { Modal } from '@/shared/components/Modal';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { useIdleLogout } from '@/shared/hooks/useIdleLogout';
import { useAuth } from '@/features/auth/AuthContext';
import { formatDate } from '@/shared/lib/format';
import { PaymentDeskProvider } from '@/features/payments/PaymentDesk';

const COLLAPSE_STORAGE_KEY = 'schoolflow:sidebar-collapsed';

/** Numéro SIGS joint depuis la bannière d'abonnement échu. */
const SUPPORT_WHATSAPP = '2290191489743';

interface AppLayoutProps {
  // Fourni quand AppLayout est utilisé hors du routeur imbriqué (ex. HomeRoute) ;
  // sinon retombe sur l'<Outlet /> classique pour les routes enfants.
  children?: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps = {}) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout, user, hasPermission } = useAuth();

  // Un compte sans aucun droit d'écriture est un compte de consultation
  // (typiquement la démonstration publique) : on l'annonce, sinon l'absence
  // de boutons d'action passe pour un bug.
  const isReadOnly =
    (user?.permissions.length ?? 0) > 0 &&
    !user!.permissions.some((code) => !code.endsWith('.view') && code !== 'debtors.print');

  const { warningVisible, secondsLeft, stayConnected } = useIdleLogout({
    enabled: true,
    onTimeout: () => logout(),
  });

  useEffect(() => {
    localStorage.setItem(COLLAPSE_STORAGE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  function toggleSidebar() {
    if (isMobile) {
      setMobileOpen((o) => !o);
    } else {
      setCollapsed((c) => !c);
    }
  }

  return (
    <PaymentDeskProvider>
      <div className="flex h-dvh overflow-hidden bg-paper">
        <Sidebar
          collapsed={!isMobile && collapsed}
          mobileOpen={isMobile && mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar collapsed={isMobile ? !mobileOpen : collapsed} onToggleSidebar={toggleSidebar} />

          {isReadOnly && (
            <div className="flex shrink-0 items-center justify-center gap-2 border-b border-gold/30 bg-gold-soft px-4 py-2 text-center text-xs font-medium text-gold">
              <Eye className="h-3.5 w-3.5 shrink-0" />
              Mode démonstration — les données sont fictives et aucune modification n'est enregistrée.
            </div>
          )}
          {/* Échéance d'abonnement dépassée : réservé à ceux qui peuvent agir dessus. */}
          {user?.school?.status === 'overdue' && hasPermission('settings.manage') && (
            <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-danger px-4 py-2.5 text-center text-sm font-semibold text-on-danger">
              <AlertTriangle className="h-4 w-4 shrink-0 animate-[pulse_2s_ease-in-out_infinite]" />
              <span>
                Abonnement échu
                {user.school.subscription_due_at ? ` depuis le ${formatDate(user.school.subscription_due_at)}` : ''}
                {user.school.blocked_from ? ` · accès suspendu le ${formatDate(user.school.blocked_from)}` : ''}
              </span>
              <a
                href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(`Bonjour, je souhaite régulariser l'abonnement SIGS de « ${user.school.name} ».`)}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-white/20 px-2.5 py-1 text-xs font-semibold text-on-danger no-underline transition hover:bg-white/30"
              >
                Régulariser
              </a>
            </div>
          )}
          {/* Seule cette zone défile — le footer ci-dessous reste fixe en bas d'écran. */}
          <main className="scrollbar-thin flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {children ?? <Outlet />}
          </main>
          <AppFooter />
        </div>

        {warningVisible && (
          <Modal title="Session bientôt expirée" onClose={stayConnected} widthClassName="max-w-sm">
            <div className="text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-gold-soft text-gold">
                <Clock className="h-6 w-6" />
              </span>
              <p className="mt-3 text-sm text-ink-soft">
                Vous serez déconnecté automatiquement dans <strong className="text-ink">{secondsLeft}s</strong> par
                mesure de sécurité, faute d'activité.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => logout()}
                  className="w-full rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-paper"
                >
                  Se déconnecter
                </button>
                <button
                  type="button"
                  onClick={stayConnected}
                  className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary transition hover:bg-primary-dark"
                >
                  Rester connecté
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </PaymentDeskProvider>
  );
}
