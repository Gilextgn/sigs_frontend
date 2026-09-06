import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/apiClient';

export interface TeacherRow {
  id: number;
  full_name: string;
  phone: string | null;
  subject: string | null;
  monthly_salary: string | null;
  status: 'active' | 'inactive';
}

export interface TeacherPayload {
  full_name: string;
  phone?: string;
  subject?: string;
  monthly_salary?: number;
  status?: 'active' | 'inactive';
}

interface PaginatedTeachers {
  data: TeacherRow[];
}

export function useTeachers(status?: string) {
  return useQuery({
    queryKey: ['teachers', status],
    queryFn: async () =>
      (await apiClient.get<PaginatedTeachers>('/teachers', { params: { status: status || undefined } })).data,
  });
}

export function useCreateTeacher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TeacherPayload) => (await apiClient.post('/teachers', payload)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teachers'] }),
  });
}

export function useUpdateTeacher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Partial<TeacherPayload> }) =>
      (await apiClient.put(`/teachers/${id}`, payload)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teachers'] }),
  });
}

export function useDeleteTeacher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => apiClient.delete(`/teachers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teachers'] }),
  });
}
