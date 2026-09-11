import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Sidebar } from '@/shared/components/Sidebar';
import { Topbar } from '@/shared/components/Topbar';
import { AppFooter } from '@/shared/components/AppFooter';
import { Modal } from '@/shared/components/Modal';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { useIdleLogout } from '@/shared/hooks/useIdleLogout';
import { useAuth } from '@/features/auth/AuthContext';

const COLLAPSE_STORAGE_KEY = 'schoolflow:sidebar-collapsed';

export function AppLayout() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout } = useAuth();

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
    <div className="flex h-dvh overflow-hidden bg-paper">
      <Sidebar
        collapsed={!isMobile && collapsed}
        mobileOpen={isMobile && mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar collapsed={isMobile ? !mobileOpen : collapsed} onToggleSidebar={toggleSidebar} />
        {/* Seule cette zone défile — le footer ci-dessous reste fixe en bas d'écran. */}
        <main className="scrollbar-thin flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
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
                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark"
              >
                Rester connecté
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
