import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { logActivity } from '../services/activity.js';

const router = Router();

const schema = z.object({
  name: z.string().min(2),
  sku: z.string().optional(),
  price: z.number().nonnegative(),
  taxRate: z.number().nonnegative().default(0),
  hsnCode: z.string().optional(),
  unit: z.string().default('unit'),
  stockEnabled: z.boolean().default(false),
  stockQty: z.number().default(0),
  lowStockThreshold: z.number().default(0),
  category: z.string().optional()
});

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM products WHERE tenant_id = ? ORDER BY id DESC').all(req.user.tenantId);
  res.json(rows);
});

router.get('/low-stock/list', (req, res) => {
  const rows = db
    .prepare(
      `SELECT * FROM products
       WHERE tenant_id = ? AND stock_enabled = 1 AND stock_qty <= low_stock_threshold
       ORDER BY stock_qty ASC`
    )
    .all(req.user.tenantId);
  res.json(rows);
});

router.post('/', (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const p = parsed.data;
  const result = db
    .prepare(
      `INSERT INTO products (tenant_id, name, sku, price, tax_rate, hsn_code, unit, stock_enabled, stock_qty, low_stock_threshold, category)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.user.tenantId,
      p.name,
      p.sku,
      p.price,
      p.taxRate,
      p.hsnCode,
      p.unit,
      p.stockEnabled ? 1 : 0,
      p.stockQty,
      p.lowStockThreshold,
      p.category
    );

  logActivity({ tenantId: req.user.tenantId, userId: req.user.sub, action: 'product.created', meta: { productId: result.lastInsertRowid } });
  res.status(201).json(db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid));
});

export default router;
