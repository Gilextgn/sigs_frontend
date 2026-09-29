import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/apiClient';

export interface ReminderConfig {
  enabled: boolean;
  days_before: number[];
  overdue_every: number;
  channels: ('email' | 'whatsapp')[];
  template: string;
  /** Avis papier général : {tranche}, {echeance}, {ecole}. */
  notice_template: string;
  last_auto_run: string | null;
}

export interface ReminderRow {
  student_id: number;
  matricule: string;
  full_name: string;
  class: string | null;
  guardian: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  items: { label: string; remaining: number; due_date: string; days: number }[];
  total: number;
  /** Jours avant la plus proche échéance (négatif = échue). */
  days: number;
  last_reminded_at: string | null;
  message: string;
  /** Un rappel automatique est prévu aujourd'hui pour cette famille. */
  due_today: boolean;
}

export interface ReminderHistoryRow {
  id: number;
  student: string | null;
  channel: 'email' | 'whatsapp' | 'whatsapp_manual';
  status: 'sent' | 'failed';
  error: string | null;
  amount: number;
  sent_by: string | null;
  created_at: string;
}

export interface RemindersData {
  config: ReminderConfig;
  whatsapp_auto: boolean;
  placeholders: string[];
  default_template: string;
  default_notice: string;
  rows: ReminderRow[];
  history: ReminderHistoryRow[];
}

export function useReminders(horizon: number) {
  return useQuery({
    queryKey: ['reminders', horizon],
    queryFn: async () => (await apiClient.get<RemindersData>('/reminders', { params: { horizon } })).data,
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['reminders'] });
}

export function useSaveReminderSettings() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (payload: Omit<ReminderConfig, 'last_auto_run'>) => (await apiClient.put<ReminderConfig>('/reminders/settings', payload)).data,
    onSuccess: invalidate,
  });
}

export function useSendReminders() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (studentIds: number[]) =>
      (await apiClient.post<{ student_id: number; logs: { channel: string; status: string; error: string | null }[] }[]>('/reminders/send', { student_ids: studentIds })).data,
    onSuccess: invalidate,
  });
}

export function useLogManualReminder() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (studentId: number) => apiClient.post(`/reminders/${studentId}/manual`),
    onSuccess: invalidate,
  });
}

/** Lien WhatsApp avec le message du directeur déjà rempli. */
export function whatsappLink(row: ReminderRow): string | null {
  const number = row.whatsapp;
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(row.message)}` : null;
}
