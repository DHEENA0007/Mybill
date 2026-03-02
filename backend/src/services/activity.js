import db from '../db.js';

export const logActivity = ({ tenantId = null, userId = null, action, meta = null }) => {
  db.prepare('INSERT INTO activity_logs (tenant_id, user_id, action, meta) VALUES (?, ?, ?, ?)').run(
    tenantId,
    userId,
    action,
    meta ? JSON.stringify(meta) : null
  );
};
