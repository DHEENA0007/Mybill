import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { logActivity } from '../services/activity.js';

const router = Router();

const customerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  taxNumber: z.string().optional(),
  billingAddress: z.string().optional(),
  creditLimit: z.number().nonnegative().default(0)
});

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM customers WHERE tenant_id = ? ORDER BY id DESC').all(req.user.tenantId);
  res.json(rows);
});

router.get('/:id/statement', (req, res) => {
  const customerId = Number(req.params.id);
  const customer = db.prepare('SELECT * FROM customers WHERE id = ? AND tenant_id = ?').get(customerId, req.user.tenantId);
  if (!customer) return res.status(404).json({ message: 'Customer not found' });

  const invoices = db.prepare('SELECT * FROM invoices WHERE tenant_id = ? AND customer_id = ? ORDER BY issue_date DESC').all(req.user.tenantId, customerId);
  const totalBilled = invoices.reduce((sum, i) => sum + i.grand_total, 0);
  const totalPaid = invoices.reduce((sum, i) => sum + i.paid_amount, 0);

  res.json({ customer, invoices, ledger: { totalBilled, totalPaid, outstanding: totalBilled - totalPaid } });
});

router.post('/', (req, res) => {
  const parsed = customerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const c = parsed.data;
  const result = db
    .prepare(
      `INSERT INTO customers (tenant_id, name, email, phone, tax_number, billing_address, credit_limit)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(req.user.tenantId, c.name, c.email || null, c.phone, c.taxNumber, c.billingAddress, c.creditLimit);

  logActivity({ tenantId: req.user.tenantId, userId: req.user.sub, action: 'customer.created', meta: { customerId: result.lastInsertRowid } });
  const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

export default router;
