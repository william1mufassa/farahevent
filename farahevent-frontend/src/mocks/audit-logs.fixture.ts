import type { AuditLogRow } from '@/types/audit-log';

/** Journal d'audit fictif (déterministe) pour la vue Activité sans backend. */

const ACTIONS = [
  { action: 'manual_payment.validate', resource_type: 'manual_payment' },
  { action: 'manual_payment.reject', resource_type: 'manual_payment' },
  { action: 'event.update', resource_type: 'event' },
  { action: 'event.status_change', resource_type: 'event' },
  { action: 'formula.create', resource_type: 'formula' },
  { action: 'ticket.scan', resource_type: 'ticket' },
  { action: 'order.refund', resource_type: 'order' },
  { action: 'admin.create', resource_type: 'admin' },
  { action: 'admin.deactivate', resource_type: 'admin' },
  { action: 'content.update', resource_type: 'event' },
  { action: 'design.update', resource_type: 'event' },
  { action: 'communication.send', resource_type: 'campaign' },
];
const ADMINS = ['awa@farahevent.tech', 'yao@farahevent.tech', 'fatou@farahevent.tech', 'ibrahim@farahevent.tech'];

export const MOCK_AUDIT_LOGS: AuditLogRow[] = Array.from({ length: 42 }, (_, i) => {
  const a = ACTIONS[i % ACTIONS.length];
  return {
    id: `log_${String(i + 1).padStart(3, '0')}`,
    admin_email: ADMINS[(i * 3) % ADMINS.length],
    action: a.action,
    resource_type: a.resource_type,
    resource_id: `${a.resource_type}_${9000 + i}`,
    ip_address: `196.20.${10 + (i % 40)}.${(i * 7) % 255}`,
    created_at: new Date(Date.now() - i * 37 * 60_000).toISOString(),
  };
});
