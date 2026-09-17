import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/apiClient';
import type { UnpaidItemRow } from '@/features/students/useStudents';

export interface DashboardSummary {
  students: number;
  classes: number;
  teachers: number;
  total_collected: number;
  outstanding: number;
  debtors: number;
  recovery_rate: number;
  theoretical_total: number;
  month: {
    start: string;
    total: number;
    payment_count: number;
    /** Mois précédent, arrêté au même jour du mois. */
    previous_total: number;
    change_percent: number | null;
  };
  today: { total: number; payment_count: number };
}

export interface RecentPayment {
  id: number;
  reference_code: string;
  total_paid_amount: string;
  payment_date: string;
  created_at: string;
  student: { id: number; matricule: string; first_name: string; last_name: string } | null;
  cashier: { full_name: string } | null;
}

export interface TopDebtor {
  student_id: number;
  matricule: string;
  full_name: string;
  class: string | null;
  theoretical_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  unpaid_items: UnpaidItemRow[];
}

export interface TopDebtors {
  total_outstanding: number;
  debtors_count: number;
  items: TopDebtor[];
}

export interface DashboardStatistics {
  period_total: number;
  period_payment_count: number;
  daily_average: number;
  comparison: { previous_total: number; change_percent: number };
  daily: { date: string; amount: number; payment_count: number }[];
}

export interface ActiveYear {
  id: number;
  code: string;
  closed_at: string | null;
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () => (await apiClient.get<DashboardSummary>('/dashboard/summary')).data,
  });
}

export function useRecentPayments() {
  return useQuery({
    queryKey: ['dashboard', 'recent-payments'],
    queryFn: async () => (await apiClient.get<RecentPayment[]>('/dashboard/recent-payments')).data,
  });
}

/**
 * Partagé par l'accueil et la cloche de la barre du haut (même clé de
 * cache) : la dette de l'école n'est calculée qu'une fois, pas à chaque
 * changement de page.
 */
export function useTopDebtors(enabled = true) {
  return useQuery({
    queryKey: ['dashboard', 'top-debtors'],
    enabled,
    staleTime: 60_000,
    queryFn: async () => (await apiClient.get<TopDebtors>('/dashboard/top-debtors', { params: { limit: 5 } })).data,
  });
}

export function useDashboardStatistics(days: number) {
  return useQuery({
    queryKey: ['dashboard', 'statistics', days],
    queryFn: async () => (await apiClient.get<DashboardStatistics>('/dashboard/statistics', { params: { days } })).data,
  });
}

export function useActiveYear() {
  return useQuery({
    queryKey: ['academic-years', 'active'],
    staleTime: 5 * 60_000,
    queryFn: async () => (await apiClient.get<ActiveYear | null>('/academic-years/active')).data,
  });
}
