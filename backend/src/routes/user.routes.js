import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import db from '../db.js';
import { permit } from '../middleware/auth.js';

const router = Router();

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(['owner', 'manager', 'staff', 'accountant']),
  password: z.string().min(8)
});

router.get('/', permit('owner', 'manager'), (req, res) => {
  const rows = db.prepare('SELECT id, name, email, role, is_active, created_at FROM users WHERE tenant_id = ? ORDER BY id DESC').all(req.user.tenantId);
  res.json(rows);
});

router.post('/', permit('owner'), async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const u = parsed.data;
  const hash = await bcrypt.hash(u.password, 10);

  try {
    const result = db.prepare('INSERT INTO users (tenant_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)').run(req.user.tenantId, u.name, u.email, hash, u.role);
    res.status(201).json(db.prepare('SELECT id, name, email, role, is_active FROM users WHERE id = ?').get(result.lastInsertRowid));
  } catch {
    res.status(409).json({ message: 'Email already exists' });
  }
});

router.patch('/:id/toggle', permit('owner'), (req, res) => {
  const user = db.prepare('SELECT id, is_active FROM users WHERE id = ? AND tenant_id = ?').get(Number(req.params.id), req.user.tenantId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(user.is_active ? 0 : 1, user.id);
  res.json({ message: 'Updated' });
});

export default router;
