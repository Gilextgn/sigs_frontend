import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/apiClient';

export interface SchoolCycle {
  id: number;
  code: string;
  label: string;
}

export interface SchoolClassRow {
  id: number;
  code: string;
  label: string;
  tuition_amount: string;
  description: string | null;
  is_active: boolean;
  cycle: SchoolCycle | null;
}

export interface ClassPayload {
  cycle_id: number;
  code: string;
  label: string;
  tuition_amount: number;
  description?: string;
}

export function useCycles() {
  return useQuery({
    queryKey: ['cycles'],
    queryFn: async () => (await apiClient.get<SchoolCycle[]>('/cycles')).data,
  });
}

export function useClasses(search?: string) {
  return useQuery({
    queryKey: ['classes', search],
    queryFn: async () =>
      (await apiClient.get<SchoolClassRow[]>('/classes', { params: { search: search || undefined } })).data,
  });
}

export function useCreateClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ClassPayload) => (await apiClient.post('/classes', payload)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classes'] }),
  });
}

export function useUpdateClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Partial<ClassPayload> }) =>
      (await apiClient.put(`/classes/${id}`, payload)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classes'] }),
  });
}

export function useDeleteClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => apiClient.delete(`/classes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classes'] }),
  });
}
