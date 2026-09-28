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
  /** Classe dédoublée : groupe (CE1 B) rattaché à sa classe principale (CE1 A). */
  parent_class_id: number | null;
  parent?: { id: number; label: string } | null;
}

export interface ClassPayload {
  cycle_id: number;
  parent_class_id?: number | null;
  code: string;
  label: string;
  tuition_amount?: number;
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

/** Ordre pédagogique : on envoie la liste complète des classes dans le nouvel ordre. */
export function useReorderClasses() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: number[]) => (await apiClient.put<SchoolClassRow[]>('/classes/reorder', { ids })).data,
    // Affichage immédiat : la flèche ne doit pas attendre le serveur.
    onMutate: (ids) => {
      queryClient.setQueryData<SchoolClassRow[]>(['classes', ''], (rows) =>
        rows ? ids.map((id) => rows.find((row) => row.id === id)).filter((row): row is SchoolClassRow => !!row) : rows,
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['classes'] }),
  });
}

export function useDeleteClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => apiClient.delete(`/classes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classes'] }),
  });
}
