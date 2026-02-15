import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';

const router = Router();

const columnSchema = z.object({
  key: z.string(),
  label: z.string(),
  width: z.number().min(40).max(400).default(120),
  align: z.enum(['left', 'center', 'right']).default('left'),
  visible: z.boolean().default(true)
});

const schema = z.object({
  name: z.string().min(2),
  isDefault: z.boolean().default(false),
  config: z.object({
    logoUrl: z.string().optional(),
    logoAlign: z.enum(['left', 'center', 'right']).default('left'),
    logoSize: z.number().min(30).max(240).default(80),
    showSignature: z.boolean().default(false),
    headerColor: z.string().default('#1e3a8a'),
    accentColor: z.string().default('#2563eb'),
    borderColor: z.string().default('#cbd5e1'),
    watermarkText: z.string().default(''),
    fontFamily: z.string().default('Inter'),
    fontSize: z.number().min(10).max(20).default(12),
    rowSpacing: z.number().min(0).max(20).default(6),
    columns: z.array(columnSchema).default([
      { key: 'item', label: 'Item', width: 220, align: 'left', visible: true },
      { key: 'qty', label: 'Qty', width: 80, align: 'right', visible: true },
      { key: 'price', label: 'Price', width: 120, align: 'right', visible: true },
      { key: 'tax', label: 'Tax %', width: 100, align: 'right', visible: true },
      { key: 'total', label: 'Total', width: 120, align: 'right', visible: true }
    ]),
    paymentTerms: z.string().default('Payment due within 15 days.'),
    returnPolicy: z.string().default('Goods once sold cannot be returned.'),
    legalNotes: z.string().default('Subject to local jurisdiction.'),
    footerNotes: z.string().default('Thank you for your business')
  })
});

router.get('/', (req, res) => {
  const rows = db
    .prepare('SELECT id, tenant_id, name, is_default, config, created_at FROM invoice_templates WHERE tenant_id = ? ORDER BY id DESC')
    .all(req.user.tenantId)
    .map((row) => ({ ...row, config: JSON.parse(row.config) }));
  res.json(rows);
});

router.post('/', (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const { name, isDefault, config } = parsed.data;

  const tx = db.transaction(() => {
    if (isDefault) {
      db.prepare('UPDATE invoice_templates SET is_default = 0 WHERE tenant_id = ?').run(req.user.tenantId);
    }
    const result = db
      .prepare('INSERT INTO invoice_templates (tenant_id, name, config, is_default) VALUES (?, ?, ?, ?)')
      .run(req.user.tenantId, name, JSON.stringify(config), isDefault ? 1 : 0);
    return result.lastInsertRowid;
  });

  const id = tx();
  const row = db.prepare('SELECT * FROM invoice_templates WHERE id = ?').get(id);
  res.status(201).json({ ...row, config: JSON.parse(row.config) });
});

router.put('/:id', (req, res) => {
  const parsed = schema.partial({ isDefault: true }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const existing = db.prepare('SELECT * FROM invoice_templates WHERE id = ? AND tenant_id = ?').get(Number(req.params.id), req.user.tenantId);
  if (!existing) return res.status(404).json({ message: 'Template not found' });

  const payload = parsed.data;
  const nextName = payload.name || existing.name;
  const nextConfig = payload.config || JSON.parse(existing.config);
  const isDefault = payload.isDefault ?? Boolean(existing.is_default);

  const tx = db.transaction(() => {
    if (isDefault) db.prepare('UPDATE invoice_templates SET is_default = 0 WHERE tenant_id = ?').run(req.user.tenantId);
    db.prepare('UPDATE invoice_templates SET name = ?, config = ?, is_default = ? WHERE id = ?').run(nextName, JSON.stringify(nextConfig), isDefault ? 1 : 0, existing.id);
  });
  tx();

  const row = db.prepare('SELECT * FROM invoice_templates WHERE id = ?').get(existing.id);
  res.json({ ...row, config: JSON.parse(row.config) });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM invoice_templates WHERE id = ? AND tenant_id = ?').run(Number(req.params.id), req.user.tenantId);
  res.json({ message: 'Template deleted' });
});

export default router;
