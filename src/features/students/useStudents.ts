import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/apiClient';

export interface StudentRow {
  id: number;
  matricule: string;
  first_name: string;
  last_name: string;
  full_name: string;
  birth_date: string | null;
  gender: 'F' | 'M' | null;
  status: string;
  class: { id: number; label: string; tuition_amount: string } | null;
  academic_year?: { id: number; code: string } | null;
  guardian: { id: number; full_name: string; relationship_label: string; phone: string } | null;
  created_at: string;
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

export function useStudents(params: { search?: string; classId?: number | ''; status?: string }, enabled = true) {
  return useQuery({
    queryKey: ['students', params],
    enabled,
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

export interface UpdateStudentPayload {
  class_id?: number;
  first_name?: string;
  last_name?: string;
  birth_date?: string | null;
  gender?: 'F' | 'M' | null;
  status?: string;
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UpdateStudentPayload }) =>
      (await apiClient.put(`/students/${id}`, payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export interface UnpaidItemRow {
  type: 'TRANCHE' | 'AUTRE_FRAIS';
  id: number;
  label: string;
  amount: number;
  paid: number;
  remaining: number;
  /** "partial" : acompte déjà versé, la ligne reste due. */
  status: 'unpaid' | 'partial';
}

export interface StudentBalance {
  theoretical_amount: number;
  paid_amount: number;
  /** Reste sur la scolarité (tranches), même base que la liste des débiteurs. */
  outstanding_amount: number;
  /** Lignes non soldées, tranches et frais obligatoires. */
  unpaid_items: UnpaidItemRow[];
  /** Reste dû qu'aucune tranche ne porte : non encaissable tant que les tranches de la classe ne le couvrent pas. */
  unlisted_amount: number;
}

export function useStudent(id: number | null) {
  return useQuery({
    queryKey: ['students', 'detail', id],
    enabled: id !== null,
    queryFn: async () => (await apiClient.get<{ data: StudentRow }>(`/students/${id}`)).data.data,
  });
}

export function useStudentBalance(id: number | null) {
  return useQuery({
    queryKey: ['students', 'balance', id],
    enabled: id !== null,
    queryFn: async () => (await apiClient.get<StudentBalance>(`/students/${id}/balance`)).data,
  });
}

export type ReEnrollmentState = 're_enrolled' | 'blocked' | 'pending';

export interface ReEnrollmentProgressStudent {
  student_id: number;
  matricule: string;
  full_name: string;
  guardian: { full_name: string; phone: string } | null;
  previous_class: { id: number; label: string | null };
  current_class_id: number | null;
  state: ReEnrollmentState;
  previous_year_outstanding: number;
  blocking_outstanding: number;
}

export interface ReEnrollmentProgress {
  active_year: { id: number; code: string; closed_at: string | null } | null;
  previous_year: { id: number; code: string; closed_at: string | null } | null;
  totals: { expected: number; re_enrolled: number; blocked: number; pending: number; new_students: number } | null;
  classes: { class_id: number; label: string | null; expected: number; re_enrolled: number; blocked: number; pending: number }[];
  students: ReEnrollmentProgressStudent[];
}

export function useReEnrollmentProgress(enabled = true) {
  return useQuery({
    queryKey: ['students', 're-enrollment-progress'],
    enabled,
    queryFn: async () => (await apiClient.get<ReEnrollmentProgress>('/students/re-enrollment-progress')).data,
  });
}

export function useBulkReEnroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { class_id: number; student_ids: number[] }) =>
      (
        await apiClient.post<{ enrolled: number[]; refused: { student_id: number; full_name: string; reason: string }[] }>(
          '/students/re-enroll-bulk',
          payload,
        )
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export interface ClosedYearDebtRow {
  academic_year: string;
  theoretical_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  unpaid_items: UnpaidItemRow[];
}

export interface ReEnrollmentContext {
  /** Dernière année suivie par l'élève (celle qui s'achève). */
  last_year: { id: number; code: string } | null;
  /** Année pour laquelle on réinscrit : celle déclarée active par l'école. */
  target_year: { id: number; code: string } | null;
  debts: ClosedYearDebtRow[];
  blocked_reason: string | null;
}

/** Année visée et éventuel motif de blocage, avant même la saisie. */
export function useReEnrollmentContext(studentId: number | null) {
  return useQuery({
    queryKey: ['students', studentId, 're-enrollment-context'],
    queryFn: async () =>
      (await apiClient.get<ReEnrollmentContext>(`/students/${studentId}/re-enrollment-context`)).data,
    enabled: studentId !== null,
  });
}

export function useReEnrollStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, classId }: { studentId: number; classId: number }) =>
      (await apiClient.post<StudentRow>(`/students/${studentId}/re-enroll`, { class_id: classId })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => apiClient.delete(`/students/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
