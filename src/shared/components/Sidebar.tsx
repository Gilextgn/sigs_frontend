import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useTopDebtors } from '@/features/dashboard/useDashboardData';
import { useReEnrollmentProgress } from '@/features/students/useStudents';
import { ConfirmDialog } from './ConfirmDialog';
import { BrandMark } from './BrandMark';
import { NAV_ITEMS, type NavItem } from './navItems';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const { user, hasPermission, logout } = useAuth();
  const location = useLocation();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [logoutOpen, setLogoutOpen] = useState(false);
  const { data: debtors } = useTopDebtors(hasPermission('dashboard.view'));
  const { data: progress } = useReEnrollmentProgress(hasPermission('students.view'));
  const badges: Record<NonNullable<NavItem['badge']>, number> = {
    reenrollments: progress?.totals?.pending ?? 0,
    debtors: debtors?.debtors_count ?? 0,
  };

  // Ouvre automatiquement le groupe qui contient la page active.
  useEffect(() => {
    function openAncestors(items: NavItem[], trail: string[]): boolean {
      for (const item of items) {
        if (item.path && (item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path))) {
          setExpanded((prev) => new Set([...prev, ...trail]));
          return true;
        }
        if (item.children && openAncestors(item.children, [...trail, item.code])) return true;
      }
      return false;
    }
    openAncestors(NAV_ITEMS, []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  function isVisible(item: NavItem): boolean {
    if (item.permission && !hasPermission(item.permission)) return false;
    if (item.children) return item.children.some(isVisible);
    return true;
  }

  function toggleGroup(code: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }

  function isActive(path?: string): boolean {
    if (!path) return false;
    return path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
  }

  function renderNode(item: NavItem, depth: number) {
    if (!isVisible(item)) return null;
    const indent = 12 + (depth - 1) * 14;

    // Barre réduite : un groupe ne peut pas s'ouvrir, on montre donc
    // directement les icônes de ses pages, séparées par un filet.
    if (item.children && collapsed) {
      return (
        <div key={item.code} className="mt-1.5 space-y-0.5 border-t border-sidebar-line pt-1.5">
          {item.children.map((child) => renderNode(child, 1))}
        </div>
      );
    }

    if (item.children) {
      const isOpen = expanded.has(item.code);
      return (
        <div key={item.code} className={depth > 1 ? 'mt-0.5' : ''}>
          <button
            type="button"
            onClick={() => toggleGroup(item.code)}
            style={{ paddingLeft: indent }}
            title={collapsed ? item.label : undefined}
            className="flex w-full items-center justify-between gap-2.5 rounded-lg py-2.5 pr-3 text-left text-[13.5px] font-semibold text-white/85 transition hover:bg-white/5 hover:text-white"
          >
            <span className="flex flex-1 items-center gap-2.5">
              <item.icon className="h-[17px] w-[17px] shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </span>
            {!collapsed && (
              <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            )}
          </button>
          {!collapsed && (
            <div
              className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
              style={{ maxHeight: isOpen ? item.children.length * 48 + 8 : 0 }}
            >
              {item.children.map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    const active = isActive(item.path);
    return (
      <NavLink
        key={item.code}
        to={item.path ?? '#'}
        onClick={() => onCloseMobile()}
        style={{ paddingLeft: indent }}
        title={collapsed ? item.label : undefined}
        className={`relative flex items-center gap-2.5 rounded-lg py-2.5 pr-3 text-[13.5px] no-underline transition ${
          active
            ? 'bg-sidebar-accent/10 font-semibold text-sidebar-accent'
            : 'font-medium text-sidebar-text hover:bg-white/5 hover:text-white'
        }`}
      >
        {active && (
          <span
            className="absolute top-1.5 bottom-1.5 -left-2.5 w-[3px] rounded-r-full bg-sidebar-accent"
          />
        )}
        <item.icon className="h-[17px] w-[17px] shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {!collapsed && item.badge && badges[item.badge] > 0 && (
          <span
            className={`font-tabular ml-auto rounded-full px-1.5 py-px text-[10.5px] font-semibold ${
              item.badge === 'debtors' ? 'bg-[#F98080]/15 text-[#F98080]' : 'bg-sidebar-accent/15 text-sidebar-accent'
            }`}
          >
            {badges[item.badge]}
          </span>
        )}
      </NavLink>
    );
  }

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onCloseMobile} aria-hidden="true" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-shrink-0 flex-col overflow-hidden bg-sidebar shadow-2xl transition-[width,transform] duration-250 ease-in-out md:static md:z-auto md:shadow-none ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{ width: collapsed ? '68px' : '260px' }}
      >
        <div className="flex items-center gap-3 border-b border-sidebar-line px-4 py-5">
          <BrandMark size={36} className="shrink-0" />
          {!collapsed && (
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate font-display text-[17px] font-bold tracking-tight text-white">SIGS</span>
              <span className="truncate text-[11px] text-sidebar-text" title={user?.school?.name}>
                {user?.school?.name ?? 'Gestion scolaire'}
              </span>
            </div>
          )}
        </div>

        <nav className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-2.5 py-3">
          {NAV_ITEMS.map((item) => renderNode(item, 1))}
        </nav>

        <div className="border-t border-sidebar-line px-2.5 py-3">
          <button
            type="button"
            onClick={() => setLogoutOpen(true)}
            title={collapsed ? 'Déconnexion' : undefined}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13.5px] font-medium text-sidebar-text transition hover:bg-[#F98080]/10 hover:text-[#F98080] ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && 'Déconnexion'}
          </button>
        </div>
      </aside>

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
