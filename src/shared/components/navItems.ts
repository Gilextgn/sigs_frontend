import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  BarChart3,
  BriefcaseBusiness,
  GraduationCap,
  School,
  Layers,
  Wallet,
  Receipt,
  UserX,
  Users2,
  Banknote,
  ShieldCheck,
  UserCog,
  BookOpenCheck,
  Landmark,
  Building2,
  Settings,
  CalendarDays,
  ClipboardCheck,
  BookOpen,
} from 'lucide-react';

export interface NavItem {
  code: string;
  label: string;
  path?: string;
  icon: LucideIcon;
  permission?: string;
  children?: NavItem[];
}

/**
 * Arborescence à profondeur libre (groupes pliables + feuilles), inspirée
 * du menu SEWAR : un groupe peut contenir des enfants qui sont eux-mêmes
 * des groupes. Un item sans "path" est un groupe pur (accordéon).
 */
export const NAV_ITEMS: NavItem[] = [
  { code: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard, permission: 'dashboard.view' },
  { code: 'statistics', label: 'Statistiques', path: '/statistics', icon: BarChart3, permission: 'dashboard.view' },
  { code: 'owner', label: 'Pilotage SIGS', path: '/owner', icon: BriefcaseBusiness, permission: 'dashboard.view' },
  {
    code: 'scolarite',
    label: 'Scolarité',
    icon: BookOpenCheck,
    children: [
      { code: 'students', label: 'Élèves', path: '/students', icon: GraduationCap, permission: 'students.view' },
      { code: 'classes', label: 'Classes', path: '/classes', icon: School, permission: 'classes.view' },
      { code: 'tranches', label: 'Tranches', path: '/tranches', icon: Layers, permission: 'tranches.view' },
      { code: 'fees', label: 'Autres frais', path: '/fees', icon: Wallet, permission: 'fees.view' },
    ],
  },
  {
    code: 'finances',
    label: 'Finances',
    icon: Landmark,
    children: [
      { code: 'payments', label: 'Paiements', path: '/payments', icon: Receipt, permission: 'payments.view' },
      { code: 'debtors', label: 'Débiteurs', path: '/debtors', icon: UserX, permission: 'debtors.print' },
    ],
  },
  {
    code: 'rh',
    label: 'Ressources humaines',
    icon: Users2,
    children: [
      { code: 'teachers', label: 'Enseignants', path: '/teachers', icon: Users2, permission: 'teachers.view' },
      { code: 'schedule', label: 'Emploi du temps', path: '/schedule', icon: CalendarDays, permission: 'teachers.view' },
      { code: 'attendance', label: 'Présence enseignants', path: '/attendance', icon: ClipboardCheck, permission: 'teachers.view' },
      { code: 'subjects', label: 'Matières', path: '/subjects', icon: BookOpen, permission: 'teachers.view' },
      { code: 'payroll', label: 'Paie', path: '/payroll', icon: Banknote, permission: 'teachers.view' },
    ],
  },
  {
    code: 'admin',
    label: 'Administration',
    icon: Building2,
    children: [
      { code: 'users', label: 'Utilisateurs', path: '/users', icon: UserCog, permission: 'users.manage' },
      { code: 'security', label: 'Sécurité', path: '/security', icon: ShieldCheck, permission: 'audit.view' },
      { code: 'settings', label: 'Paramètres', path: '/settings', icon: Settings, permission: 'settings.view' },
    ],
  },
];

/** Aplatit l'arbre pour retrouver rapidement le libellé d'une route (breadcrumb, titre topbar). */
export function flattenNavItems(items: NavItem[] = NAV_ITEMS): NavItem[] {
  return items.flatMap((item) => (item.children ? flattenNavItems(item.children) : [item]));
}

export interface BreadcrumbEntry {
  label: string;
  path?: string;
}

/** Reconstitue le fil d'Ariane (groupes parents + page courante) pour une route donnée. */
export function findBreadcrumbTrail(pathname: string, items: NavItem[] = NAV_ITEMS): BreadcrumbEntry[] {
  function walk(nodes: NavItem[]): BreadcrumbEntry[] | null {
    for (const node of nodes) {
      const matches = node.path && (node.path === '/' ? pathname === '/' : pathname.startsWith(node.path));
      if (matches) return [{ label: node.label, path: node.path }];
      if (node.children) {
        const childTrail = walk(node.children);
        if (childTrail) return [{ label: node.label }, ...childTrail];
      }
    }
    return null;
  }

  return walk(items) ?? [{ label: 'Dashboard', path: '/' }];
}
