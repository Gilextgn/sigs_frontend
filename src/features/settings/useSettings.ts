import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/apiClient';
import type { UnpaidItemRow } from '@/features/students/useStudents';

export interface SchoolSettings {
  school_name: string;
  currency: string;
  letterhead_url: string | null;
}

export interface AcademicYearRow {
  id: number;
  code: string;
  label: string;
  is_active: boolean;
  date_start: string | null;
  date_end: string | null;
  closed_at: string | null;
  /** Garde-fou : pas de clôture avant cette date (fin d'année − 60 j). */
  closable_from: string | null;
}


export interface YearDebtorRow {
  student_id: number;
  matricule: string;
  full_name: string;
  theoretical_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  unpaid_items: UnpaidItemRow[];
}

export function useSchoolSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await apiClient.get<SchoolSettings>('/settings')).data,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { school_name?: string; currency?: string }) =>
      (await apiClient.put<SchoolSettings>('/settings', payload)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });
}

export function useUploadLetterhead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('letterhead', file);
      // Sans ce Content-Type vidé, l'en-tête JSON par défaut du client
      // l'emporte : le fichier partait sans délimiteur multipart et le
      // serveur ne recevait aucune image.
      return (await apiClient.post<SchoolSettings>('/settings/letterhead', formData, { headers: { 'Content-Type': undefined } })).data;
    },
    onSuccess: (settings) => queryClient.setQueryData(['settings'], settings),
  });
}

export function useDeleteLetterhead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await apiClient.delete<SchoolSettings>('/settings/letterhead')).data,
    onSuccess: (settings) => queryClient.setQueryData(['settings'], settings),
  });
}

export function useAcademicYears() {
  return useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => (await apiClient.get<AcademicYearRow[]>('/academic-years')).data,
  });
}

export function useCreateAcademicYear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { code: string; is_active?: boolean }) =>
      (await apiClient.post<AcademicYearRow>('/academic-years', payload)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['academic-years'] }),
  });
}

export function useActivateAcademicYear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.post<AcademicYearRow>(`/academic-years/${id}/activate`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['academic-years'] }),
  });
}

export function useClosingPreview(yearId: number | null) {
  return useQuery({
    queryKey: ['academic-years', yearId, 'closing-preview'],
    queryFn: async () => (await apiClient.get<YearDebtorRow[]>(`/academic-years/${yearId}/closing-preview`)).data,
    enabled: yearId !== null,
  });
}

export function useCloseAcademicYear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) =>
      (await apiClient.post<{ academic_year: AcademicYearRow; debtors: YearDebtorRow[] }>(`/academic-years/${id}/close`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['academic-years'] }),
  });
}

export function useReopenAcademicYear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.post<AcademicYearRow>(`/academic-years/${id}/reopen`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['academic-years'] }),
  });
}
