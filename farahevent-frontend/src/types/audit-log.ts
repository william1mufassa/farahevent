/** Journal d'audit admin (CONCEPTION_FRONTEND.md §10.5). */
export interface AuditLogRow {
  id: string;
  admin_email: string | null;
  /** Ex. `event.update`, `manual_payment.validate`. */
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface AuditLogsQuery {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditLogsResult {
  rows: AuditLogRow[];
  total: number;
}
