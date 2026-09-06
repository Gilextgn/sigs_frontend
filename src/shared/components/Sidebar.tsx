import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { ConfirmDialog } from './ConfirmDialog';
import { NAV_ITEMS, type NavItem } from './navItems';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const { hasPermission, logout } = useAuth();
  const location = useLocation();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [logoutOpen, setLogoutOpen] = useState(false);

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

    if (item.children) {
      const isOpen = expanded.has(item.code);
      return (
        <div key={item.code} className={depth > 1 ? 'mt-0.5' : ''}>
          <button
            type="button"
            onClick={() => toggleGroup(item.code)}
            style={{ paddingLeft: indent }}
            className={`flex w-full items-center justify-between gap-2.5 rounded-lg py-2.5 pr-3 text-left transition ${
              depth === 1 ? 'text-[13px] font-semibold text-white/90' : 'text-[13px] font-medium text-white/75'
            } hover:bg-white/10 hover:text-white`}
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
        className={`relative flex items-center gap-2.5 rounded-lg py-2.5 pr-3 text-[13.5px] font-medium no-underline transition ${
          active ? 'bg-white/95 font-semibold text-primary shadow-md' : 'text-white/75 hover:bg-white/10 hover:text-white'
        }`}
      >
        {active && (
          <span
            className="absolute top-1 bottom-1 -left-2 w-[3px] rounded-r-full"
            style={{ background: 'var(--color-sidebar-accent)' }}
          />
        )}
        <item.icon className={`h-[17px] w-[17px] shrink-0 ${active ? 'text-primary' : ''}`} />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </NavLink>
    );
  }

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onCloseMobile} aria-hidden="true" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-shrink-0 flex-col overflow-hidden shadow-2xl transition-[width,transform] duration-250 ease-in-out md:static md:z-auto md:shadow-none ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{
          width: collapsed ? '68px' : '260px',
          background: 'linear-gradient(160deg, var(--color-sidebar-from) 0%, var(--color-sidebar-to) 100%)',
        }}
      >
        <div className="flex items-center gap-3 border-b border-white/15 px-4 py-5">
          <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-white/95 p-1 shadow-inner">
            <img src="/images/branding/logo-192.png" alt="SIGS" className="h-full w-full object-contain" />
          </span>
          {!collapsed && (
            <div className="flex min-w-0 flex-col">
              <span
                className="truncate bg-gradient-to-r from-white via-sky-200 to-white bg-[length:200%_auto] bg-clip-text font-display text-lg font-extrabold tracking-wide text-transparent"
                style={{ animation: 'shine 3s linear infinite' }}
              >
                SIGS
              </span>
              <span className="text-[10px] tracking-wide text-white/55">Espace administration</span>
            </div>
          )}
        </div>

        <nav className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-2.5 py-3">
          {NAV_ITEMS.map((item) => renderNode(item, 1))}
        </nav>

        <div className="border-t border-white/15 px-2.5 py-3">
          <button
            type="button"
            onClick={() => setLogoutOpen(true)}
            className={`flex w-full items-center gap-2.5 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2.5 text-[13.5px] font-semibold text-red-200 transition hover:border-red-400/60 hover:bg-red-500/20 hover:text-white ${
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
