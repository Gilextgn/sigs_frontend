import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/apiClient';

export interface FeeTypeRow {
  id: number;
  code: string | null;
  label: string;
  category: string | null;
  amount: string;
  is_active: boolean;
  is_mandatory: boolean;
  classes: { id: number; label: string }[];
}

export interface FeeTypePayload {
  code?: string;
  label: string;
  category?: string;
  amount: number;
  class_ids: number[];
  is_mandatory?: boolean;
}

export function useFeeTypes(search?: string) {
  return useQuery({
    queryKey: ['fees', search],
    queryFn: async () =>
      (await apiClient.get<FeeTypeRow[]>('/fees', { params: { search: search || undefined } })).data,
  });
}

export function useCreateFeeType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: FeeTypePayload) => (await apiClient.post('/fees', payload)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fees'] }),
  });
}

export function useUpdateFeeType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: FeeTypePayload }) =>
      (await apiClient.put(`/fees/${id}`, payload)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fees'] }),
  });
}

export function useDeleteFeeType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => apiClient.delete(`/fees/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fees'] }),
  });
}
