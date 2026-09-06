import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/apiClient';

export interface AuditLogRow {
  id: number;
  action_code: string;
  entity_name: string;
  entity_id: string | null;
  entity_label: string | null;
  ip_address: string | null;
  created_at: string;
  actor: { id: number; full_name: string } | null;
}

interface PaginatedAuditLogs {
  data: AuditLogRow[];
}

export function useAuditLogs(entityName?: string) {
  return useQuery({
    queryKey: ['audit-logs', entityName],
    queryFn: async () =>
      (await apiClient.get<PaginatedAuditLogs>('/audit-logs', { params: { entity_name: entityName || undefined } })).data,
  });
}
