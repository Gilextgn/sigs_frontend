import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/apiClient';

export interface AdminNotificationRow {
  id: number;
  action_code: string;
  title: string;
  body: string | null;
  entity_name: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
  /** Site d'origine (directeur d'un groupe scolaire). */
  site?: string | null;
}

/**
 * Traçabilité : encaissements, annulations, renvois de reçu et clôtures faits
 * par un autre acteur qu'un administrateur. Relu toutes les 20 secondes pour que
 * le message arrive presque aussitôt à l'écran de l'administrateur.
 */
export function useAdminNotifications(enabled = true) {
  return useQuery({
    queryKey: ['notifications'],
    enabled,
    refetchInterval: 20_000,
    queryFn: async () => (await apiClient.get<{ unread_count: number; data: AdminNotificationRow[] }>('/notifications')).data,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number | 'all') => apiClient.post(id === 'all' ? '/notifications/read-all' : `/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
