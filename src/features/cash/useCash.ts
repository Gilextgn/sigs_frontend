import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/apiClient';

export interface CashReportPayment {
  id: number;
  reference_code: string;
  payment_date: string;
  created_at: string;
  cashier: string | null;
  total_paid_amount: number;
  lines: { label: string; amount: number }[];
}

export interface CashReportClass {
  class: string;
  payment_count: number;
  total_amount: number;
  students: {
    student_id: number;
    matricule: string | null;
    full_name: string;
    total_amount: number;
    payments: CashReportPayment[];
  }[];
}

export interface CashClosingRow {
  id: number;
  closing_date: string;
  cashier_id: number;
  cashier: string | null;
  payment_count: number;
  expected_amount: number;
  counted_amount: number;
  difference: number;
  note: string | null;
  closed_at: string;
  reopened_at: string | null;
  reopened_by: string | null;
  reopen_reason: string | null;
}

export interface CashCancellation {
  reference_code: string;
  payment_date: string;
  student: string | null;
  class: string | null;
  total_paid_amount: number;
  cashier: string | null;
  deleted_at: string;
  deleted_by: string | null;
  reason: string | null;
}

export interface CashReport {
  from: string;
  to: string;
  payment_count: number;
  total_amount: number;
  by_class: CashReportClass[];
  by_cashier: { cashier_id: number; full_name: string | null; payment_count: number; total_amount: number }[];
  by_day: { date: string; payment_count: number; total_amount: number }[];
  by_line: { label: string; total_amount: number }[];
  cancellations: CashCancellation[];
  closings: CashClosingRow[];
  my_day: { date: string; payment_count: number; expected_amount: number; closed: boolean };
}

export function useCashReport(from: string, to: string) {
  return useQuery({
    queryKey: ['cash', 'report', from, to],
    queryFn: async () => (await apiClient.get<CashReport>('/cash/report', { params: { from, to } })).data,
  });
}

function useInvalidateCash() {
  const queryClient = useQueryClient();
  return () => {
    for (const key of ['cash', 'payments']) queryClient.invalidateQueries({ queryKey: [key] });
  };
}

export function useCloseCash() {
  const invalidate = useInvalidateCash();
  return useMutation({
    mutationFn: async (payload: { counted_amount: number; note?: string }) =>
      (await apiClient.post('/cash/closings', payload)).data,
    onSuccess: invalidate,
  });
}

export function useReopenCash() {
  const invalidate = useInvalidateCash();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) =>
      (await apiClient.post(`/cash/closings/${id}/reopen`, { reason })).data,
    onSuccess: invalidate,
  });
}
