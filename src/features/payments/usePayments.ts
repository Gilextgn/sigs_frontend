import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/apiClient';

export interface PaymentItemRow {
  id: number;
  item_type: 'TRANCHE' | 'AUTRE_FRAIS';
  tuition_installment_id: number | null;
  fee_type_id: number | null;
  expected_amount: string;
  paid_amount: string;
  /** Libellé réel de la tranche ou du frais. */
  label: string;
  /** Cumul versé sur cette ligne jusqu'à ce paiement inclus. */
  paid_to_date: number;
  /** Ce qu'il reste à payer sur la ligne après ce paiement. */
  remaining_after: number;
  /** "partial" = acompte : la ligne n'est pas encore soldée. */
  line_status: 'partial' | 'settled';
}

export interface PaymentItemWithLabel extends PaymentItemRow {
  tuition_installment: { label: string } | null;
  fee_type: { label: string } | null;
}

export interface PaymentRow {
  id: number;
  reference_code: string;
  payment_date: string;
  created_at: string;
  total_paid_amount: string;
  is_partial: boolean;
  student: {
    id: number;
    matricule: string;
    first_name: string;
    last_name: string;
    school_class?: { id: number; label: string } | null;
  } | null;
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

/** Données du reçu PDF à partir d'un paiement tel que renvoyé par l'API. */
export function toReceiptData(payment: PaymentRow, classLabel?: string | null) {
  return {
    reference_code: payment.reference_code,
    payment_date: payment.payment_date,
    student: payment.student
      ? { ...payment.student, class: classLabel ?? payment.student.school_class?.label ?? null }
      : null,
    cashier: payment.cashier,
    items: payment.items.map((item) => ({
      label: item.label,
      expected_amount: Number(item.expected_amount),
      paid_amount: Number(item.paid_amount),
      paid_to_date: Number(item.paid_to_date),
      remaining_after: Number(item.remaining_after),
    })),
    total_paid_amount: payment.total_paid_amount,
  };
}

export function useStudentPayments(studentId: number | null) {
  return useQuery({
    queryKey: ['payments', 'by-student', studentId],
    enabled: !!studentId,
    queryFn: async () =>
      (await apiClient.get<PaginatedPayments>('/payments', { params: { student_id: studentId, per_page: 1000 } })).data,
  });
}

export type PaymentDetail = PaymentRow;

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
      // Un encaissement change les soldes partout : débiteurs, fiche élève,
      // rentrée (un élève bloqué peut se débloquer), accueil.
      for (const key of ['payments', 'dashboard', 'debtors', 'students', 'academic-years']) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => apiClient.delete(`/payments/${id}`),
    onSuccess: () => {
      // Un encaissement change les soldes partout : débiteurs, fiche élève,
      // rentrée (un élève bloqué peut se débloquer), accueil.
      for (const key of ['payments', 'dashboard', 'debtors', 'students', 'academic-years']) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });
}
