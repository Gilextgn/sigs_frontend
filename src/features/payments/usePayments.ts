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
  /** Présent à la création et dans le détail : QR code de vérification du reçu. */
  verification_token?: string;
  deliveries?: ReceiptDeliveryRow[];
  receipt_contacts?: { email: string | null; whatsapp: string | null; whatsapp_auto: boolean };
}

export interface ReceiptDeliveryRow {
  id: number;
  channel: 'email' | 'whatsapp';
  recipient: string;
  status: 'sent' | 'failed';
  error: string | null;
  created_at: string;
}

interface PaginatedPayments {
  data: PaymentRow[];
}

export interface NewPaymentLine {
  item_type: 'TRANCHE' | 'AUTRE_FRAIS';
  tuition_installment_id?: number;
  fee_type_id?: number;
  /** Mois réglé (1-12) pour un frais mensuel. */
  period_month?: number;
  paid_amount: number;
}

export function usePayments(studentId?: number | '') {
  return useQuery({
    queryKey: ['payments', studentId],
    queryFn: async () =>
      (await apiClient.get<PaginatedPayments>('/payments', { params: { student_id: studentId || undefined, per_page: 1000 } })).data,
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
    verification_token: payment.verification_token ?? null,
    created_at: payment.created_at ?? null,
  };
}

export function useSendReceipt(paymentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (channels?: ('email' | 'whatsapp')[]) =>
      (await apiClient.post<PaymentDetail>(`/payments/${paymentId}/send-receipt`, { channels })).data,
    onSuccess: (payment) => queryClient.setQueryData(['payments', 'detail', paymentId], payment),
  });
}

/** Message pré-rempli pour l'envoi manuel sur WhatsApp (quand l'envoi automatique n'est pas activé). */
export function whatsappReceiptLink(payment: PaymentRow, schoolName: string, verificationUrl: string) {
  const number = payment.receipt_contacts?.whatsapp;
  if (!number) return null;
  const student = payment.student ? `${payment.student.first_name} ${payment.student.last_name}` : '';
  const total = new Intl.NumberFormat('fr-FR').format(Number(payment.total_paid_amount));
  const text = [
    `${schoolName} — Reçu de paiement`,
    `Élève : ${student}`,
    `Montant versé : ${total} F CFA`,
    `Référence : ${payment.reference_code}`,
    `Vérifier ce reçu : ${verificationUrl}`,
  ].join('\n');
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
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
      for (const key of ['payments', 'dashboard', 'debtors', 'students', 'academic-years', 'cash']) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    // Motif obligatoire : l'annulation apparaît dans le point de caisse.
    mutationFn: async ({ id, reason }: { id: number; reason: string }) =>
      apiClient.delete(`/payments/${id}`, { data: { reason } }),
    onSuccess: () => {
      // Un encaissement change les soldes partout : débiteurs, fiche élève,
      // rentrée (un élève bloqué peut se débloquer), accueil.
      for (const key of ['payments', 'dashboard', 'debtors', 'students', 'academic-years', 'cash']) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });
}
