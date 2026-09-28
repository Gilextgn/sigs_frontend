import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/apiClient';
import type { UnpaidItemRow } from '@/features/students/useStudents';

export interface FeeSubscriptionRow {
  fee_type_id: number;
  label: string;
  amount: number;
  billing_cycle: 'once' | 'monthly';
  months: number[];
  subscribed: boolean;
}

/** Ligne encaissable : dûe ou non, soldée, facultative ou à venir comprises. */
export interface PayableLineRow extends Omit<UnpaidItemRow, 'status'> {
  status: 'unpaid' | 'partial' | 'settled';
  /** Compte comme dette (tranche, frais obligatoire, frais auquel l'élève est inscrit). */
  owed: boolean;
  /** Échue : un mois à venir est payable d'avance mais pas encore dû. */
  due: boolean;
}

export const MONTH_LABELS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
/** Mois dans l'ordre de l'année scolaire. */
export const SCHOOL_YEAR_MONTHS = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8];

export function usePayableLines(studentId: number | null) {
  return useQuery({
    queryKey: ['students', 'payable-lines', studentId],
    enabled: !!studentId,
    queryFn: async () =>
      (await apiClient.get<{ lines: PayableLineRow[]; unlisted_amount: number }>(`/students/${studentId}/payable-lines`)).data,
  });
}

export function useFeeSubscriptions(studentId: number | null) {
  return useQuery({
    queryKey: ['students', 'fee-subscriptions', studentId],
    enabled: !!studentId,
    queryFn: async () => (await apiClient.get<FeeSubscriptionRow[]>(`/students/${studentId}/fee-subscriptions`)).data,
  });
}

export function useUpdateFeeSubscriptions(studentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (feeTypeIds: number[]) =>
      (await apiClient.put<FeeSubscriptionRow[]>(`/students/${studentId}/fee-subscriptions`, { fee_type_ids: feeTypeIds })).data,
    onSuccess: () => {
      // L'inscription change ce que doit l'élève : fiche, débiteurs, accueil.
      for (const key of ['students', 'debtors', 'dashboard']) queryClient.invalidateQueries({ queryKey: [key] });
    },
  });
}
