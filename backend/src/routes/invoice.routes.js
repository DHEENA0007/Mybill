import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { logActivity } from '../services/activity.js';

const router = Router();

const itemSchema = z.object({
  productId: z.number().optional(),
  description: z.string().min(2),
  qty: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  taxRate: z.number().nonnegative().default(0)
});

const invoiceSchema = z.object({
  customerId: z.number(),
  type: z.enum(['gst', 'non-gst', 'proforma', 'credit-note', 'debit-note', 'quotation', 'recurring']),
  issueDate: z.string(),
  dueDate: z.string().optional(),
  discountTotal: z.number().nonnegative().default(0),
  notes: z.string().optional(),
  recurringFrequency: z.string().optional(),
  items: z.array(itemSchema).min(1)
});

const paymentSchema = z.object({
  amount: z.number().positive(),
  paidOn: z.string(),
  method: z.string().default('bank_transfer'),
  reference: z.string().optional()
});

const emailSchema = z.object({
  toEmail: z.string().email(),
  subject: z.string().min(3),
  body: z.string().min(5)
});

const getInvoiceStatus = (total, paid, dueDate) => {
  if (paid === 0 && dueDate && new Date(dueDate) < new Date()) return 'overdue';
  if (paid === 0) return 'sent';
  if (paid < total) return 'partially-paid';
  return 'paid';
};

router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT i.*, c.name as customer_name FROM invoices i
       JOIN customers c ON c.id = i.customer_id
       WHERE i.tenant_id = ? ORDER BY i.id DESC`
    )
    .all(req.user.tenantId);
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND tenant_id = ?').get(Number(req.params.id), req.user.tenantId);
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoice.id);
  const payments = db.prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY paid_on DESC').all(invoice.id);
  res.json({ ...invoice, items, payments });
});

router.get('/:id/pdf', (req, res) => {
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND tenant_id = ?').get(Number(req.params.id), req.user.tenantId);
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

  res.json({
    message: 'PDF generation placeholder - integrate with a PDF engine in production.',
    invoiceId: invoice.id,
    downloadUrl: `/api/invoices/${invoice.id}/pdf-file`
  });
});

router.post('/:id/email', (req, res) => {
  const parsed = emailSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND tenant_id = ?').get(Number(req.params.id), req.user.tenantId);
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

  db.prepare('INSERT INTO email_queue (tenant_id, to_email, subject, body, status) VALUES (?, ?, ?, ?, ?)').run(
    req.user.tenantId,
    parsed.data.toEmail,
    parsed.data.subject,
    parsed.data.body,
    'queued'
  );

  logActivity({ tenantId: req.user.tenantId, userId: req.user.sub, action: 'invoice.email.queued', meta: { invoiceId: invoice.id, toEmail: parsed.data.toEmail } });
  res.json({ message: 'Invoice email queued' });
});

router.post('/', (req, res) => {
  const parsed = invoiceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const data = parsed.data;
  const subtotal = data.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);
  const taxTotal = data.items.reduce((sum, it) => sum + (it.qty * it.unitPrice * it.taxRate) / 100, 0);
  const grandTotal = subtotal + taxTotal - data.discountTotal;

  const invoiceNo = `INV-${Date.now()}`;
  const insertInvoice = db.prepare(
    `INSERT INTO invoices (tenant_id, customer_id, invoice_no, type, status, issue_date, due_date, subtotal, tax_total, discount_total, grand_total, paid_amount, notes, recurring_frequency)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const tx = db.transaction(() => {
    const invoice = insertInvoice.run(
      req.user.tenantId,
      data.customerId,
      invoiceNo,
      data.type,
      getInvoiceStatus(grandTotal, 0, data.dueDate),
      data.issueDate,
      data.dueDate,
      subtotal,
      taxTotal,
      data.discountTotal,
      grandTotal,
      0,
      data.notes,
      data.recurringFrequency
    );

    const insertItem = db.prepare(
      `INSERT INTO invoice_items (invoice_id, product_id, description, qty, unit_price, tax_rate, line_total)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    for (const item of data.items) {
      const lineTotal = item.qty * item.unitPrice + (item.qty * item.unitPrice * item.taxRate) / 100;
      insertItem.run(invoice.lastInsertRowid, item.productId, item.description, item.qty, item.unitPrice, item.taxRate, lineTotal);
    }

    return invoice.lastInsertRowid;
  });

  const id = tx();
  logActivity({ tenantId: req.user.tenantId, userId: req.user.sub, action: 'invoice.created', meta: { invoiceId: id } });
  res.status(201).json(db.prepare('SELECT * FROM invoices WHERE id = ?').get(id));
});

router.post('/:id/payments', (req, res) => {
  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND tenant_id = ?').get(Number(req.params.id), req.user.tenantId);
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

  const tx = db.transaction(() => {
    db.prepare('INSERT INTO payments (tenant_id, invoice_id, amount, paid_on, method, reference) VALUES (?, ?, ?, ?, ?, ?)').run(
      req.user.tenantId,
      invoice.id,
      parsed.data.amount,
      parsed.data.paidOn,
      parsed.data.method,
      parsed.data.reference
    );
    const newPaid = invoice.paid_amount + parsed.data.amount;
    db.prepare('UPDATE invoices SET paid_amount = ?, status = ? WHERE id = ?').run(
      newPaid,
      getInvoiceStatus(invoice.grand_total, newPaid, invoice.due_date),
      invoice.id
    );
  });

  tx();
  logActivity({ tenantId: req.user.tenantId, userId: req.user.sub, action: 'invoice.payment.recorded', meta: { invoiceId: invoice.id, amount: parsed.data.amount } });
  res.json(db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoice.id));
});

export default router;
