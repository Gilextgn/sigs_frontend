import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/apiClient';
import type { CurrentUser } from '@/features/auth/AuthContext';

export type SchoolStatus = 'active' | 'overdue' | 'suspended';

export interface PlatformSchool {
  id: number;
  name: string;
  status: SchoolStatus;
  /** manual : suspendue par vous ; payment : suspension automatique pour impayé. */
  suspension_kind: 'manual' | 'payment' | null;
  suspension_reason: string | null;
  suspended_at: string | null;
  subscription_due_at: string | null;
  blocked_from: string | null;
  auto_suspend: boolean;
  grace_days: number;
  users_count: number;
  last_login_at: string | null;
  admin: { id: number; full_name: string; email: string } | null;
  contact_name: string | null;
  /** Numéro WhatsApp du contact, tel que saisi. */
  contact_phone: string | null;
  city: string | null;
  /** Mensualité habituelle (XOF) : pré-remplit l'encaissement. */
  plan_amount: number | null;
  last_payment_at: string | null;
  last_reminded_at: string | null;
  created_at: string;
}

export type PaymentMethod = 'mobile_money' | 'cash' | 'bank' | 'other';

export interface SchoolPaymentRow {
  id: number;
  amount: number;
  paid_at: string;
  months: number;
  due_before: string | null;
  due_after: string;
  method: PaymentMethod | null;
  reference: string | null;
  note: string | null;
  recorded_by: string | null;
}

export interface SchoolContactPayload {
  contact_name?: string | null;
  contact_phone?: string | null;
  city?: string | null;
  notes?: string | null;
  plan_amount?: number | null;
}

export interface NewSchoolPaymentPayload {
  amount: number;
  paid_at: string;
  months: number;
  due_after?: string | null;
  method?: PaymentMethod | null;
  reference?: string | null;
  note?: string | null;
  reactivate?: boolean;
}

export interface PlatformSchoolDetail extends PlatformSchool {
  notes: string | null;
  total_paid: number;
  payments: SchoolPaymentRow[];
  admins: { id: number; full_name: string; email: string; status: string; last_login_at: string | null }[];
  events: { id: number; action: string; reason: string | null; actor: string | null; created_at: string }[];
}

export interface PlatformOverview {
  summary: { total: number; active: number; overdue: number; suspended: number };
  revenue: { this_month: number; last_month: number; this_year: number };
  schools: PlatformSchool[];
}

export interface NewSchoolPayload extends SchoolContactPayload {
  name: string;
  admin_name: string;
  admin_email: string;
  admin_password: string;
  subscription_due_at?: string | null;
  auto_suspend: boolean;
  grace_days: number;
}

const KEY = ['platform', 'schools'] as const;

export function usePlatformSchools() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => (await apiClient.get<PlatformOverview>('/platform/schools')).data,
  });
}

export function usePlatformSchool(id: number | null) {
  return useQuery({
    queryKey: [...KEY, id],
    enabled: id !== null,
    queryFn: async () => (await apiClient.get<PlatformSchoolDetail>(`/platform/schools/${id}`)).data,
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: KEY });
}

export function useCreateSchool() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (payload: NewSchoolPayload) => (await apiClient.post<PlatformSchoolDetail>('/platform/schools', payload)).data,
    onSuccess: invalidate,
  });
}

export function useUpdateSchool() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: number; name?: string; subscription_due_at?: string | null; auto_suspend?: boolean; grace_days?: number } & SchoolContactPayload) =>
      (await apiClient.put<PlatformSchoolDetail>(`/platform/schools/${id}`, payload)).data,
    onSuccess: invalidate,
  });
}

export function useSuspendSchool() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) =>
      (await apiClient.post<PlatformSchoolDetail>(`/platform/schools/${id}/suspend`, { reason: reason || null })).data,
    onSuccess: invalidate,
  });
}

export function useReactivateSchool() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, subscription_due_at }: { id: number; subscription_due_at?: string | null }) =>
      (await apiClient.post<PlatformSchoolDetail>(`/platform/schools/${id}/reactivate`, { subscription_due_at: subscription_due_at || null })).data,
    onSuccess: invalidate,
  });
}

export function useResetAdminPassword() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, userId }: { id: number; userId?: number }) =>
      (await apiClient.post<{ user_id: number; email: string; temporary_password: string }>(`/platform/schools/${id}/reset-admin-password`, { user_id: userId })).data,
    onSuccess: invalidate,
  });
}

export function useUpdateSchoolAdmin() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ schoolId, userId, ...payload }: { schoolId: number; userId: number; full_name: string; email: string }) =>
      (await apiClient.put<PlatformSchoolDetail>(`/platform/schools/${schoolId}/admins/${userId}`, payload)).data,
    onSuccess: invalidate,
  });
}

export function useRecordSchoolPayment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ schoolId, ...payload }: { schoolId: number } & NewSchoolPaymentPayload) =>
      (await apiClient.post<PlatformSchoolDetail>(`/platform/schools/${schoolId}/payments`, payload)).data,
    onSuccess: invalidate,
  });
}

export function useDeleteSchoolPayment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ schoolId, paymentId }: { schoolId: number; paymentId: number }) =>
      (await apiClient.delete<PlatformSchoolDetail>(`/platform/schools/${schoolId}/payments/${paymentId}`)).data,
    onSuccess: invalidate,
  });
}

export function useLogReminder() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (schoolId: number) => (await apiClient.post(`/platform/schools/${schoolId}/reminders`, { channel: 'whatsapp' })).data,
    onSuccess: invalidate,
  });
}

export function useUpdateAccount() {
  return useMutation({
    mutationFn: async (payload: { full_name: string; email: string; current_password?: string }) =>
      (await apiClient.put<{ user: CurrentUser }>('/platform/account', payload)).data,
  });
}

/** Mot de passe lisible à dicter : sans 0/O ni 1/l/I. */
export function generatePassword(length = 10): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}
