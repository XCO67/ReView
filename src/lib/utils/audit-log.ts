import { getDb } from '../database/connection';

export type AuditEventType = 'login' | 'logout' | 'login_failed';

export async function recordAuditEvent(
  userId: number,
  eventType: AuditEventType,
  ipAddress: string,
  userAgent?: string | null
) {
  const db = getDb();
  await db.query(
    `INSERT INTO audit_logs (user_id, event_type, ip_address, user_agent)
     VALUES ($1, $2, $3, $4)`,
    [userId, eventType, ipAddress, userAgent ?? null]
  );
}

export interface AuditLogEntry {
  id: number;
  user_id: number;
  event_type: AuditEventType;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
  username: string;
  name: string;
}

export async function getAuditLogs(limit = 100): Promise<AuditLogEntry[]> {
  const db = getDb();
  const result = await db.query<AuditLogEntry>(
    `SELECT al.*, u.username, u.name
     FROM audit_logs al
     JOIN users u ON al.user_id = u.id
     ORDER BY al.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

