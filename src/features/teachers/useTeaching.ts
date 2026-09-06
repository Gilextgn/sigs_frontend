import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/apiClient';

export interface SubjectRow { id: number; code: string; label: string; }
export interface AssignmentRow {
  id: number;
  teacher_id: number;
  class_id: number;
  subject_id: number;
  hourly_rate: string;
  weekly_hours: string | null;
  teacher?: { full_name: string };
  school_class?: { label: string };
  subject?: { label: string };
}
export interface ScheduleRow {
  id: number;
  class_id: number;
  subject_id: number;
  teacher_assignment_id: number;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
  room: string | null;
  school_class?: { label: string };
  subject?: { label: string };
  assignment?: { teacher?: { full_name: string } };
}
export interface SessionRow {
  id: number;
  session_date: string;
  starts_at: string;
  ends_at: string;
  planned_minutes: number;
  realized_minutes: number;
  status: string;
  school_class?: { label: string };
  assignment?: { teacher?: { id: number; full_name: string }; subject?: { label: string } };
  attendance?: { status: string; absence_minutes: number; reason: string | null } | null;
}

export function useSubjects(search?: string) {
  return useQuery({ queryKey: ['subjects', search], queryFn: async () => (await apiClient.get<SubjectRow[]>('/subjects', { params: { search } })).data });
}
export function useAssignments() {
  return useQuery({ queryKey: ['teacher-assignments'], queryFn: async () => (await apiClient.get<AssignmentRow[]>('/teacher-assignments')).data });
}
export function useSchedules(classId?: number | '') {
  return useQuery({ queryKey: ['schedules', classId], queryFn: async () => (await apiClient.get<ScheduleRow[]>('/schedules', { params: { class_id: classId || undefined } })).data });
}
export function useCreateSubject() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async (payload: { code: string; label: string }) => (await apiClient.post('/subjects', payload)).data, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subjects'] }) });
}
export function useDeleteSubject() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async (id: number) => apiClient.delete(`/subjects/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subjects'] }) });
}
export function useCreateAssignment() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async (payload: { teacher_id: number; class_id: number; subject_id: number; hourly_rate: number; weekly_hours?: number }) => (await apiClient.post('/teacher-assignments', payload)).data, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] }) });
}
export function useCreateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async (payload: { class_id: number; subject_id: number; teacher_assignment_id: number; day_of_week: number; starts_at: string; ends_at: string; room?: string }) => (await apiClient.post('/schedules', payload)).data, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedules'] }) });
}
export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async (id: number) => apiClient.delete(`/schedules/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedules'] }) });
}
export function useCreateAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { teaching_session_id: number; teacher_id: number; status: string; absence_minutes?: number; reason?: string }) => (await apiClient.post('/teacher-attendances', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-attendances'] });
      // Les séances embarquent leur présence (session.attendance) : sans
      // cette invalidation, la ligne ne reflète pas l'enregistrement tant
      // que l'utilisateur ne change pas de date.
      queryClient.invalidateQueries({ queryKey: ['teaching-sessions'] });
    },
  });
}
export function useGenerateSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { date: string }) => (await apiClient.post('/teaching-sessions/generate', payload)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teaching-sessions'] }),
  });
}
export function useSessions(date?: string) {
  return useQuery({ queryKey: ['teaching-sessions', date], queryFn: async () => (await apiClient.get<SessionRow[]>('/teaching-sessions', { params: { date } })).data });
}
export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async (payload: { class_id: number; subject_id: number; teacher_assignment_id: number; session_date: string; starts_at: string; ends_at: string; planned_minutes: number }) => (await apiClient.post('/teaching-sessions', payload)).data, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teaching-sessions'] }) });
}
