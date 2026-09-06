import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/apiClient';

export interface StudentRow {
  id: number;
  matricule: string;
  full_name: string;
  status: string;
  class: { id: number; label: string; tuition_amount: string } | null;
  guardian: { full_name: string; phone: string } | null;
}

interface PaginatedStudents {
  data: StudentRow[];
  meta?: { current_page: number; last_page: number; total: number };
}

export interface NewStudentPayload {
  class_id: number;
  first_name: string;
  last_name: string;
  birth_date?: string;
  gender?: 'F' | 'M';
  guardian: {
    full_name: string;
    relationship_label: string;
    phone: string;
    address?: string;
  };
}

export function useStudents(params: { search?: string; classId?: number | ''; status?: string }) {
  return useQuery({
    queryKey: ['students', params],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedStudents>('/students', {
        params: {
          search: params.search || undefined,
          class_id: params.classId || undefined,
          status: params.status || undefined,
        },
      });
      return data;
    },
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: NewStudentPayload) => (await apiClient.post('/students', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
