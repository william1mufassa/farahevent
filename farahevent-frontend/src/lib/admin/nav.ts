import {
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  type LucideIcon,
  Megaphone,
  QrCode,
  ScrollText,
  Users,
  UsersRound,
  Wallet,
} from 'lucide-react';
import type { AdminRole } from '@/types/admin';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Rôles voyant l'entrée. L'API reste l'autorité (garde double). */
  roles: AdminRole[];
}

/**
 * Navigation admin filtrée par rôle (CONCEPTION_FRONTEND.md §10.1).
 * Routes en français (renommage Lot 6). L'agent ne voit que le scan.
 */
export const ADMIN_NAV: NavItem[] = [
  { href: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, roles: ['super_admin', 'manager', 'comptable'] },
  { href: '/admin/evenements', label: 'Événements', icon: CalendarDays, roles: ['super_admin', 'manager'] },
  { href: '/admin/participants', label: 'Participants', icon: UsersRound, roles: ['super_admin', 'manager'] },
  { href: '/admin/paiements', label: 'Paiements', icon: CreditCard, roles: ['super_admin', 'manager', 'comptable'] },
  { href: '/admin/scan', label: 'Scan', icon: QrCode, roles: ['super_admin', 'agent'] },
  { href: '/admin/finances', label: 'Finances', icon: Wallet, roles: ['super_admin', 'comptable'] },
  { href: '/admin/communications', label: 'Communications', icon: Megaphone, roles: ['super_admin', 'manager'] },
  { href: '/admin/equipe', label: 'Équipe', icon: Users, roles: ['super_admin'] },
  { href: '/admin/activite', label: 'Activité', icon: ScrollText, roles: ['super_admin'] },
];

export function navForRole(role: AdminRole): NavItem[] {
  return ADMIN_NAV.filter((item) => item.roles.includes(role));
}

/** Page d'accueil par rôle : l'agent atterrit sur le scan (pas de dashboard). */
export function homeForRole(role: AdminRole): string {
  return role === 'agent' ? '/admin/scan' : '/admin';
}
