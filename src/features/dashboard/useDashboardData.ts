import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/apiClient';

export interface DashboardSummary {
  students: number;
  classes: number;
  teachers: number;
  total_collected: number;
  outstanding: number;
  debtors: number;
  recovery_rate: number;
}

export interface CycleBreakdownRow {
  cycle: string;
  total: number;
}

export interface RecentPayment {
  id: number;
  reference_code: string;
  total_paid_amount: string;
  payment_date: string;
  student: { matricule: string; first_name: string; last_name: string } | null;
}

export interface TopDebtor {
  student_id: number;
  matricule: string;
  full_name: string;
  class: string | null;
  outstanding_amount: number;
}

export interface DashboardStatistics {
  period_total: number;
  period_payment_count: number;
  daily_average: number;
  comparison: { previous_total: number; change_percent: number };
  daily: { date: string; amount: number; payment_count: number }[];
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () => (await apiClient.get<DashboardSummary>('/dashboard/summary')).data,
  });
}

export function useCycleBreakdown() {
  return useQuery({
    queryKey: ['dashboard', 'cycle-breakdown'],
    queryFn: async () => (await apiClient.get<CycleBreakdownRow[]>('/dashboard/cycle-breakdown')).data,
  });
}

export function useRecentPayments() {
  return useQuery({
    queryKey: ['dashboard', 'recent-payments'],
    queryFn: async () => (await apiClient.get<RecentPayment[]>('/dashboard/recent-payments')).data,
  });
}

export function useTopDebtors() {
  return useQuery({
    queryKey: ['dashboard', 'top-debtors'],
    queryFn: async () => (await apiClient.get<TopDebtor[]>('/dashboard/top-debtors')).data,
  });
}

export function useDashboardStatistics(days: number) {
  return useQuery({
    queryKey: ['dashboard', 'statistics', days],
    queryFn: async () => (await apiClient.get<DashboardStatistics>('/dashboard/statistics', { params: { days } })).data,
  });
}
