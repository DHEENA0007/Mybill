import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { logActivity } from '../services/activity.js';

const router = Router();

const schema = z.object({
  category: z.string().min(2),
  amount: z.number().positive(),
  spentOn: z.string(),
  vendor: z.string().optional(),
  notes: z.string().optional(),
  attachmentUrl: z.string().optional()
});

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM expenses WHERE tenant_id = ? ORDER BY spent_on DESC, id DESC').all(req.user.tenantId);
  res.json(rows);
});

router.post('/', (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const e = parsed.data;
  const result = db
    .prepare('INSERT INTO expenses (tenant_id, category, amount, spent_on, vendor, notes, attachment_url, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(req.user.tenantId, e.category, e.amount, e.spentOn, e.vendor, e.notes, e.attachmentUrl, req.user.sub);

  logActivity({ tenantId: req.user.tenantId, userId: req.user.sub, action: 'expense.created', meta: { expenseId: result.lastInsertRowid } });
  res.status(201).json(db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid));
});

export default router;
