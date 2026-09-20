import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/apiClient';

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
  created_at: string;
}

export interface PlatformSchoolDetail extends PlatformSchool {
  admins: { id: number; full_name: string; email: string; status: string; last_login_at: string | null }[];
  events: { id: number; action: string; reason: string | null; actor: string | null; created_at: string }[];
}

export interface PlatformOverview {
  summary: { total: number; active: number; overdue: number; suspended: number };
  schools: PlatformSchool[];
}

export interface NewSchoolPayload {
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
    mutationFn: async ({ id, ...payload }: { id: number; name?: string; subscription_due_at?: string | null; auto_suspend?: boolean; grace_days?: number }) =>
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

/** Mot de passe lisible à dicter : sans 0/O ni 1/l/I. */
export function generatePassword(length = 10): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}
