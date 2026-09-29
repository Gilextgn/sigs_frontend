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
  details_json: Record<string, unknown> | null;
  /** Modification automatique : valeurs avant / après (champs chiffrés masqués). */
  changes_json: { before: Record<string, unknown> | null; after: Record<string, unknown> | null } | null;
  actor: { id: number; full_name: string } | null;
}

interface PaginatedAuditLogs {
  data: AuditLogRow[];
  total: number;
  current_page: number;
  last_page: number;
}

export interface AuditFilters {
  category: string;
  from: string;
  to: string;
  page: number;
}

export function useAuditLogs(filters: AuditFilters) {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () =>
      (
        await apiClient.get<PaginatedAuditLogs>('/audit-logs', {
          params: { category: filters.category || undefined, from: filters.from || undefined, to: filters.to || undefined, page: filters.page, per_page: 50 },
        })
      ).data,
  });
}
