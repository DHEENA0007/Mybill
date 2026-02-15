import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { permit } from '../middleware/auth.js';

const router = Router();

const schema = z.object({
  subject: z.string().min(4),
  message: z.string().min(5),
  priority: z.enum(['low', 'medium', 'high']).default('medium')
});

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM support_tickets WHERE tenant_id = ? ORDER BY id DESC').all(req.user.tenantId);
  res.json(rows);
});

router.post('/', (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const t = parsed.data;
  const result = db
    .prepare('INSERT INTO support_tickets (tenant_id, user_id, subject, message, priority, status) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.user.tenantId, req.user.sub, t.subject, t.message, t.priority, 'open');
  res.status(201).json(db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(result.lastInsertRowid));
});

router.patch('/:id/status', permit('owner', 'manager'), (req, res) => {
  const { status } = req.body;
  if (!['open', 'in_progress', 'closed'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
  db.prepare('UPDATE support_tickets SET status = ? WHERE id = ? AND tenant_id = ?').run(status, Number(req.params.id), req.user.tenantId);
  res.json({ message: 'Updated' });
});

export default router;
