import { adminApi } from '@/lib/admin-api';
import type { AuditLogRow, AuditLogsQuery, AuditLogsResult } from '@/types/audit-log';
import { MOCK_AUDIT_LOGS } from '@/mocks/audit-logs.fixture';

const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === '1';

export async function getAuditLogs(q: AuditLogsQuery): Promise<AuditLogsResult> {
  if (IS_MOCK) {
    let rows = MOCK_AUDIT_LOGS;
    const search = (q.search ?? '').trim().toLowerCase();
    if (search) {
      rows = rows.filter(
        (r) =>
          r.action.toLowerCase().includes(search) ||
          (r.admin_email ?? '').toLowerCase().includes(search) ||
          (r.resource_type ?? '').toLowerCase().includes(search),
      );
    }
    const total = rows.length;
    const pageSize = q.pageSize ?? 20;
    const page = q.page ?? 1;
    return { rows: rows.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize), total };
  }

  const params = new URLSearchParams({
    limit: String(q.pageSize ?? 20),
    offset: String(((q.page ?? 1) - 1) * (q.pageSize ?? 20)),
  });
  if (q.search) params.set('action_prefix', q.search);
  const rows = (await adminApi.get<AuditLogRow[]>(`/admin/audit-logs/?${params}`)).data;
  return { rows, total: rows.length };
}
