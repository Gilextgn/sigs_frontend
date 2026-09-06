import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/apiClient';

export interface DebtorRow {
  student_id: number;
  matricule: string;
  full_name: string;
  class: string | null;
  theoretical_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  unpaid_items: { type: string; label: string; amount: number; paid: number; remaining: number }[];
}

export function useDebtors(params: { classId?: number | ''; trancheId?: number | '' }) {
  return useQuery({
    queryKey: ['debtors', params],
    queryFn: async () =>
      (
        await apiClient.get<DebtorRow[]>('/debtors', {
          params: {
            class_id: params.classId || undefined,
            tranche_id: params.trancheId || undefined,
          },
        })
      ).data,
  });
}
