import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.post('/webhook', (req, res) => {
  const { tenantId, amount, billingCycle, status, gatewayRef } = req.body;
  if (!tenantId || !amount || !billingCycle || !status) return res.status(400).json({ message: 'Invalid payload' });

  db.prepare('INSERT INTO subscription_transactions (tenant_id, amount, billing_cycle, status, gateway_ref, paid_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)').run(
    tenantId,
    amount,
    billingCycle,
    status,
    gatewayRef || `WEBHOOK-${Date.now()}`
  );

  if (status === 'success') {
    db.prepare("UPDATE tenants SET status = 'active', renewal_date = date('now', ?) WHERE id = ?").run(
      billingCycle === 'monthly' ? '+30 day' : '+365 day',
      tenantId
    );
  }

  res.json({ message: 'Webhook processed' });
});

export default router;
