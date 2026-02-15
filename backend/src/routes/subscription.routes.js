import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { logActivity } from '../services/activity.js';

const router = Router();

const renewSchema = z.object({
  billingCycle: z.enum(['monthly', 'yearly']),
  amount: z.number().positive(),
  couponCode: z.string().optional()
});

router.get('/me', (req, res) => {
  const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(req.user.tenantId);
  const txs = db.prepare('SELECT * FROM subscription_transactions WHERE tenant_id = ? ORDER BY id DESC').all(req.user.tenantId);
  res.json({ tenant, transactions: txs });
});

router.post('/renew', (req, res) => {
  const parsed = renewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { billingCycle, amount, couponCode } = parsed.data;

  let finalAmount = amount;
  if (couponCode) {
    const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND active = 1').get(couponCode);
    if (coupon) {
      finalAmount = coupon.discount_type === 'percentage' ? amount - (amount * coupon.discount_value) / 100 : Math.max(0, amount - coupon.discount_value);
      db.prepare('UPDATE coupons SET redemption_count = redemption_count + 1 WHERE id = ?').run(coupon.id);
    }
  }

  db.prepare('UPDATE tenants SET billing_cycle = ?, renewal_date = date("now", ?) WHERE id = ?').run(
    billingCycle,
    billingCycle === 'monthly' ? '+30 day' : '+365 day',
    req.user.tenantId
  );
  db.prepare('INSERT INTO subscription_transactions (tenant_id, amount, billing_cycle, status, gateway_ref, paid_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)').run(
    req.user.tenantId,
    finalAmount,
    billingCycle,
    'success',
    `MANUAL-${Date.now()}`
  );

  logActivity({ tenantId: req.user.tenantId, userId: req.user.sub, action: 'subscription.renewed', meta: { billingCycle, finalAmount } });
  res.json({ message: 'Subscription renewed', finalAmount });
});

router.post('/cancel', (_req, res) => {
  db.prepare("UPDATE tenants SET status = 'expired' WHERE id = ?").run(_req.user.tenantId);
  res.json({ message: 'Subscription cancelled' });
});

export default router;
