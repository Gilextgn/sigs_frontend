import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/apiClient';

export interface TrancheRow {
  id: number;
  label: string;
  amount: string;
  due_date: string | null;
  class_id: number;
  school_class: { id: number; label: string; tuition_amount: string } | null;
}

export interface TranchePayload {
  class_id: number;
  label: string;
  amount: number;
  due_date?: string;
}

export function useTranches(classId?: number | '') {
  return useQuery({
    queryKey: ['tranches', classId],
    queryFn: async () =>
      (await apiClient.get<TrancheRow[]>('/tranches', { params: { class_id: classId || undefined } })).data,
  });
}

export function useCreateTranche() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TranchePayload) => (await apiClient.post('/tranches', payload)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tranches'] }),
  });
}

export function useDeleteTranche() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => apiClient.delete(`/tranches/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tranches'] }),
  });
}
