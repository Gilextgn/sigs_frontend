import type { LucideIcon } from 'lucide-react';
import {
  Banknote,
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  HandCoins,
  House,
  Layers,
  Lock,
  Receipt,
  RefreshCcw,
  School,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  Users2,
  UserX,
  Wallet,
  Backpack,
  Landmark,
} from 'lucide-react';

export interface NavItem {
  code: string;
  label: string;
  path?: string;
  icon: LucideIcon;
  permission?: string;
  /** Compteur affiché à droite du libellé (travail en attente). */
  badge?: 'reenrollments' | 'debtors';
  children?: NavItem[];
}

/**
 * Menu rangé par moment de vie de l'école (pas par table) : un directeur
 * cherche « la rentrée », « la caisse », « qui me doit » — pas « tranches ».
 * Un item sans "path" est un groupe pliable ; profondeur 2 maximum.
 */
export const NAV_ITEMS: NavItem[] = [
  { code: 'home', label: 'Accueil', path: '/', icon: House, permission: 'dashboard.view' },
  {
    code: 'rentree',
    label: 'Rentrée',
    icon: Backpack,
    children: [
      { code: 'reenrollments', label: 'Réinscriptions', path: '/rentree', icon: RefreshCcw, permission: 'students.view', badge: 'reenrollments' },
      { code: 'students', label: 'Élèves', path: '/students', icon: GraduationCap, permission: 'students.view' },
      { code: 'classes', label: 'Classes', path: '/classes', icon: School, permission: 'classes.view' },
    ],
  },
  {
    code: 'caisse',
    label: 'Caisse',
    icon: HandCoins,
    children: [
      { code: 'payments', label: 'Paiements', path: '/payments', icon: Receipt, permission: 'payments.view' },
      { code: 'statistics', label: 'Statistiques', path: '/statistics', icon: BarChart3, permission: 'dashboard.view' },
    ],
  },
  {
    code: 'recouvrement',
    label: 'Recouvrement',
    icon: UserX,
    children: [
      { code: 'debtors', label: 'Débiteurs', path: '/debtors', icon: UserX, permission: 'debtors.print', badge: 'debtors' },
      { code: 'year-closing', label: "Clôture d'année", path: '/year-closing', icon: Lock, permission: 'settings.view' },
    ],
  },
  {
    code: 'ecole',
    label: 'École',
    icon: Landmark,
    children: [
      { code: 'tranches', label: 'Tranches', path: '/tranches', icon: Layers, permission: 'tranches.view' },
      { code: 'fees', label: 'Autres frais', path: '/fees', icon: Wallet, permission: 'fees.view' },
      { code: 'teachers', label: 'Enseignants', path: '/teachers', icon: Users2, permission: 'teachers.view' },
      { code: 'schedule', label: 'Emploi du temps', path: '/schedule', icon: CalendarDays, permission: 'teachers.view' },
      { code: 'attendance', label: 'Présences', path: '/attendance', icon: ClipboardCheck, permission: 'teachers.view' },
      { code: 'subjects', label: 'Matières', path: '/subjects', icon: BookOpen, permission: 'teachers.view' },
      { code: 'payroll', label: 'Paie', path: '/payroll', icon: Banknote, permission: 'teachers.view' },
    ],
  },
  {
    code: 'admin',
    label: 'Administration',
    icon: SlidersHorizontal,
    children: [
      { code: 'settings', label: 'Paramètres', path: '/settings', icon: Settings, permission: 'settings.view' },
      { code: 'users', label: 'Utilisateurs', path: '/users', icon: UserCog, permission: 'users.manage' },
      { code: 'security', label: 'Sécurité', path: '/security', icon: ShieldCheck, permission: 'audit.view' },
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

  return walk(items) ?? [{ label: 'Accueil', path: '/' }];
}
