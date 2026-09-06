import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/apiClient';

export interface PaymentItemRow {
  id: number;
  item_type: 'TRANCHE' | 'AUTRE_FRAIS';
  tuition_installment_id: number | null;
  fee_type_id: number | null;
  expected_amount: string;
  paid_amount: string;
}

export interface PaymentItemWithLabel extends PaymentItemRow {
  tuition_installment: { label: string } | null;
  fee_type: { label: string } | null;
}

export interface PaymentRow {
  id: number;
  reference_code: string;
  payment_date: string;
  total_paid_amount: string;
  student: { id: number; matricule: string; first_name: string; last_name: string } | null;
  cashier: { full_name: string } | null;
  items: PaymentItemWithLabel[];
  remaining_amount?: number;
}

interface PaginatedPayments {
  data: PaymentRow[];
}

export interface NewPaymentLine {
  item_type: 'TRANCHE' | 'AUTRE_FRAIS';
  tuition_installment_id?: number;
  fee_type_id?: number;
  paid_amount: number;
}

export function usePayments(studentId?: number | '') {
  return useQuery({
    queryKey: ['payments', studentId],
    queryFn: async () =>
      (await apiClient.get<PaginatedPayments>('/payments', { params: { student_id: studentId || undefined } })).data,
  });
}

export function useStudentPayments(studentId: number | null) {
  return useQuery({
    queryKey: ['payments', 'by-student', studentId],
    enabled: !!studentId,
    queryFn: async () =>
      (await apiClient.get<PaginatedPayments>('/payments', { params: { student_id: studentId, per_page: 1000 } })).data,
  });
}

export interface PaymentDetail {
  id: number;
  reference_code: string;
  payment_date: string;
  total_paid_amount: string;
  student: {
    id: number;
    matricule: string;
    first_name: string;
    last_name: string;
    school_class?: { label: string } | null;
  } | null;
  cashier: { full_name: string } | null;
  items: (PaymentItemRow & {
    tuition_installment: { label: string } | null;
    fee_type: { label: string } | null;
  })[];
}

export function usePaymentDetail(id: number | null) {
  return useQuery({
    queryKey: ['payments', 'detail', id],
    enabled: id !== null,
    queryFn: async () => (await apiClient.get<PaymentDetail>(`/payments/${id}`)).data,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { student_id: number; items: NewPaymentLine[] }) =>
      (await apiClient.post<PaymentRow>('/payments', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => apiClient.delete(`/payments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
