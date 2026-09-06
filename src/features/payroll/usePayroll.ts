import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/apiClient';

export interface PayrollEntryRow {
  id: number;
  period: string;
  base_amount: string;
  bonus_amount: string;
  deduction_amount: string;
  status: 'pending' | 'paid';
  paid_at: string | null;
  teacher: { id: number; full_name: string; subject: string | null } | null;
}

export interface PayrollEstimate { worked_minutes: number; worked_hours: number; amount: number; }

export interface PayrollDetailSession {
  id: number;
  session_date: string;
  class_label: string;
  subject_label: string;
  planned_minutes: number;
  paid_minutes: number;
  status: string;
  absence_minutes: number;
  reason: string | null;
}

export interface PayrollDetail {
  id: number;
  period: string;
  teacher: { id: number; full_name: string } | null;
  base_amount: number;
  bonus_amount: number;
  deduction_amount: number;
  status: 'pending' | 'paid';
  paid_at: string | null;
  net_amount: number;
  sessions: PayrollDetailSession[];
}

export interface PayrollPayload {
  teacher_id: number;
  period: string;
  base_amount: number;
  bonus_amount?: number;
  deduction_amount?: number;
}

interface PaginatedPayroll {
  data: PayrollEntryRow[];
}

export function usePayrollEntries(period?: string) {
  return useQuery({
    queryKey: ['payroll', period],
    queryFn: async () =>
      (await apiClient.get<PaginatedPayroll>('/payroll', { params: { period: period || undefined } })).data,
  });
}

export function useCreatePayrollEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PayrollPayload) => (await apiClient.post('/payroll', payload)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll'] }),
  });
}

export function usePayrollDetail(id?: number) {
  return useQuery({
    queryKey: ['payroll-detail', id],
    enabled: Boolean(id),
    queryFn: async () => (await apiClient.get<PayrollDetail>(`/payroll/${id}`)).data,
  });
}

export function usePayrollEstimate(teacherId: number | '', period: string) {
  return useQuery({
    queryKey: ['payroll-estimate', teacherId, period],
    enabled: Boolean(teacherId && period),
    queryFn: async () => (await apiClient.get<PayrollEstimate>('/payroll/estimate', { params: { teacher_id: teacherId, period } })).data,
  });
}

export function useMarkPayrollPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.post(`/payroll/${id}/mark-paid`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll'] }),
  });
}
