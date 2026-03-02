import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import db from '../db.js';
import { issueToken, requireAuth } from '../middleware/auth.js';

const router = Router();

const registerSchema = z.object({
  companyName: z.string().min(2),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly')
});

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const { companyName, name, email, password, billingCycle } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);

  const tenantStmt = db.prepare(
    'INSERT INTO tenants (name, billing_cycle, plan_type, trial_ends_at, renewal_date) VALUES (?, ?, ?, date("now", "+14 day"), date("now", "+30 day"))'
  );
  const tenant = tenantStmt.run(companyName, billingCycle, 'single');

  const userStmt = db.prepare(
    'INSERT INTO users (tenant_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)'
  );

  try {
    const user = userStmt.run(tenant.lastInsertRowid, name, email, passwordHash, 'owner');
    const created = db
      .prepare('SELECT id, tenant_id, email, role, name FROM users WHERE id = ?')
      .get(user.lastInsertRowid);
    const token = issueToken(created);
    return res.status(201).json({ token, user: created });
  } catch {
    db.prepare('DELETE FROM tenants WHERE id = ?').run(tenant.lastInsertRowid);
    return res.status(409).json({ message: 'Email already exists' });
  }
});

router.post('/login', async (req, res) => {
  const schema = z.object({ email: z.string().email(), password: z.string().min(8) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(parsed.data.email);
  if (!user || !user.is_active) return res.status(401).json({ message: 'Invalid credentials' });

  const isValid = await bcrypt.compare(parsed.data.password, user.password_hash);
  if (!isValid) return res.status(401).json({ message: 'Invalid credentials' });

  const token = issueToken(user);
  return res.json({
    token,
    user: { id: user.id, tenant_id: user.tenant_id, role: user.role, name: user.name, email: user.email }
  });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, tenant_id, role, name, email FROM users WHERE id = ?').get(req.user.sub);
  const announcements = db.prepare('SELECT * FROM announcements WHERE target IN (?, ?) ORDER BY id DESC LIMIT 20').all('all', String(req.user.tenantId));
  res.json({ user, announcements });
});

export default router;
