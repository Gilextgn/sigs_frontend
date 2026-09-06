import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/apiClient';

export interface RoleRow {
  id: number;
  code: string;
  label: string;
  permissions: { id: number; code: string; label: string }[];
}

export interface PermissionRow {
  id: number;
  code: string;
  label: string;
}

export interface UserRow {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  status: 'active' | 'inactive' | 'locked';
  role: { id: number; code: string; label: string } | null;
}

export interface UserDetail extends UserRow {
  permission_overrides: string[];
}

export interface UserPayload {
  full_name: string;
  email: string;
  password?: string;
  phone?: string;
  role_id: number;
  status?: 'active' | 'inactive' | 'locked';
  permissions: string[];
}

interface PaginatedUsers {
  data: UserRow[];
}

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => (await apiClient.get<RoleRow[]>('/roles')).data,
  });
}

export function usePermissionsCatalog() {
  return useQuery({
    queryKey: ['permissions-catalog'],
    queryFn: async () => (await apiClient.get<PermissionRow[]>('/roles/permissions-catalog')).data,
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => (await apiClient.get<PaginatedUsers>('/users')).data,
  });
}

export function useUserDetail(id: number | null) {
  return useQuery({
    queryKey: ['users', id],
    enabled: id !== null,
    queryFn: async () => (await apiClient.get<UserDetail>(`/users/${id}`)).data,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UserPayload) => (await apiClient.post('/users', payload)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Partial<UserPayload> }) =>
      (await apiClient.put(`/users/${id}`, payload)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => apiClient.delete(`/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}
