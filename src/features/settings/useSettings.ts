import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/apiClient';

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
      return (await apiClient.post<SchoolSettings>('/settings/letterhead', formData)).data;
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
