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

/** Remise de caisse : le caissier remet au directeur l'argent encaissé depuis sa dernière remise. */
export interface CashHandoverRow {
  id: number;
  cashier_id: number;
  cashier: string | null;
  received_by: string | null;
  payment_count: number;
  expected_amount: number;
  received_amount: number;
  difference: number;
  note: string | null;
  created_at: string;
}

export interface CashHandoverDetail extends CashHandoverRow {
  payments: { reference_code: string; payment_date: string; student: string | null; class: string | null; amount: number }[];
}

/** Argent encaissé par un caissier et pas encore remis. */
export interface PendingCash {
  payment_count: number;
  expected_amount: number;
  first_date: string | null;
  last_date: string | null;
}

export interface PendingHandoverRow extends PendingCash {
  cashier_id: number;
  cashier: string;
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
  handovers: CashHandoverRow[];
  my_pending: PendingCash;
}

export function useCashReport(from: string, to: string) {
  return useQuery({
    queryKey: ['cash', 'report', from, to],
    queryFn: async () => (await apiClient.get<CashReport>('/cash/report', { params: { from, to } })).data,
  });
}

export function usePendingHandovers(enabled: boolean) {
  return useQuery({
    queryKey: ['cash', 'pending'],
    enabled,
    queryFn: async () => (await apiClient.get<PendingHandoverRow[]>('/cash/pending')).data,
  });
}

export function useReceiveCash() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { cashier_user_id: number; received_amount: number; note?: string }) =>
      (await apiClient.post<CashHandoverDetail>('/cash/handovers', payload)).data,
    onSuccess: () => {
      for (const key of ['cash', 'payments', 'dashboard']) queryClient.invalidateQueries({ queryKey: [key] });
    },
  });
}

export async function fetchHandover(id: number): Promise<CashHandoverDetail> {
  return (await apiClient.get<CashHandoverDetail>(`/cash/handovers/${id}`)).data;
}
