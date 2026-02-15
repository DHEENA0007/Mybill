import { Router } from 'express';
import db from '../db.js';
import { permit } from '../middleware/auth.js';

const router = Router();

router.use(permit('super_admin'));

router.get('/overview', (_req, res) => {
  const subscribers = db.prepare('SELECT COUNT(*) as count FROM tenants').get().count;
  const active = db.prepare("SELECT COUNT(*) as count FROM tenants WHERE status = 'active'").get().count;
  const expired = db.prepare("SELECT COUNT(*) as count FROM tenants WHERE status = 'expired'").get().count;
  const failedPayments = db.prepare("SELECT COUNT(*) as count FROM subscription_transactions WHERE status = 'failed'").get().count;
  const mrr = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM subscription_transactions WHERE billing_cycle='monthly' AND status='success'").get().total;
  const yearlyRevenue = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM subscription_transactions WHERE billing_cycle='yearly' AND status='success'").get().total;

  res.json({ subscribers, active, expired, failedPayments, mrr, yearlyRevenue });
});

router.get('/system-health', (_req, res) => {
  const dbStatus = db.prepare('SELECT 1 as ok').get().ok === 1 ? 'ok' : 'down';
  const settings = db.prepare('SELECT * FROM app_settings WHERE id = 1').get();
  res.json({ dbStatus, maintenanceMode: Boolean(settings.maintenance_mode), timestamp: new Date().toISOString() });
});

router.get('/settings', (_req, res) => {
  res.json(db.prepare('SELECT * FROM app_settings WHERE id = 1').get());
});

router.patch('/settings', (req, res) => {
  const { maintenanceMode, planMonthly, planYearly, trialDays } = req.body;
  const current = db.prepare('SELECT * FROM app_settings WHERE id = 1').get();

  db.prepare(
    `UPDATE app_settings
     SET maintenance_mode = ?, plan_monthly = ?, plan_yearly = ?, trial_days = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = 1`
  ).run(
    maintenanceMode === undefined ? current.maintenance_mode : maintenanceMode ? 1 : 0,
    planMonthly ?? current.plan_monthly,
    planYearly ?? current.plan_yearly,
    trialDays ?? current.trial_days
  );

  res.json(db.prepare('SELECT * FROM app_settings WHERE id = 1').get());
});

router.get('/tenants', (_req, res) => {
  const rows = db.prepare('SELECT * FROM tenants ORDER BY id DESC').all();
  res.json(rows);
});

router.patch('/tenants/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['active', 'suspended', 'expired'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  db.prepare('UPDATE tenants SET status = ? WHERE id = ?').run(status, Number(req.params.id));
  return res.json({ message: 'Updated' });
});

router.post('/coupons', (req, res) => {
  const { code, discountType, discountValue, validUntil, maxRedemptions } = req.body;
  if (!code || !discountType || !discountValue) return res.status(400).json({ message: 'Invalid payload' });
  db.prepare('INSERT INTO coupons (code, discount_type, discount_value, valid_until, max_redemptions, active) VALUES (?, ?, ?, ?, ?, 1)').run(
    code,
    discountType,
    discountValue,
    validUntil,
    maxRedemptions || null
  );
  res.status(201).json({ message: 'Coupon created' });
});

router.get('/coupons', (_req, res) => {
  res.json(db.prepare('SELECT * FROM coupons ORDER BY id DESC').all());
});

router.post('/announcements', (req, res) => {
  const { title, body, target = 'all' } = req.body;
  if (!title || !body) return res.status(400).json({ message: 'Invalid payload' });
  db.prepare('INSERT INTO announcements (title, body, target) VALUES (?, ?, ?)').run(title, body, target);
  res.status(201).json({ message: 'Announcement sent' });
});

router.get('/announcements', (_req, res) => {
  res.json(db.prepare('SELECT * FROM announcements ORDER BY id DESC').all());
});

router.get('/tickets', (_req, res) => {
  const rows = db.prepare(
    `SELECT t.*, te.name as tenant_name, u.name as user_name
     FROM support_tickets t
     LEFT JOIN tenants te ON te.id = t.tenant_id
     LEFT JOIN users u ON u.id = t.user_id
     ORDER BY t.id DESC`
  ).all();
  res.json(rows);
});

router.patch('/tickets/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['open', 'in_progress', 'closed'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
  db.prepare('UPDATE support_tickets SET status = ? WHERE id = ?').run(status, Number(req.params.id));
  res.json({ message: 'Updated' });
});

router.get('/refunds', (_req, res) => {
  res.json(db.prepare('SELECT * FROM refunds ORDER BY id DESC').all());
});

router.post('/refunds', (req, res) => {
  const { tenantId, subscriptionTransactionId, amount, reason } = req.body;
  if (!tenantId || !amount) return res.status(400).json({ message: 'Invalid payload' });
  db.prepare('INSERT INTO refunds (tenant_id, subscription_transaction_id, amount, reason, status) VALUES (?, ?, ?, ?, ?)').run(
    tenantId,
    subscriptionTransactionId || null,
    amount,
    reason || null,
    'pending'
  );
  res.status(201).json({ message: 'Refund request created' });
});

router.patch('/refunds/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['pending', 'approved', 'rejected', 'processed'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
  db.prepare('UPDATE refunds SET status = ? WHERE id = ?').run(status, Number(req.params.id));
  res.json({ message: 'Updated' });
});

router.get('/activity-logs', (_req, res) => {
  const rows = db.prepare('SELECT * FROM activity_logs ORDER BY id DESC LIMIT 300').all();
  res.json(rows);
});

export default router;
