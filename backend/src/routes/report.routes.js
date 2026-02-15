import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/summary', (req, res) => {
  const sales = db.prepare('SELECT COALESCE(SUM(grand_total),0) as total FROM invoices WHERE tenant_id = ?').get(req.user.tenantId).total;
  const received = db.prepare('SELECT COALESCE(SUM(paid_amount),0) as total FROM invoices WHERE tenant_id = ?').get(req.user.tenantId).total;
  const expenses = db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE tenant_id = ?').get(req.user.tenantId).total;
  const overdue = db.prepare("SELECT COUNT(*) as count FROM invoices WHERE tenant_id = ? AND status = 'overdue'").get(req.user.tenantId).count;
  const stockAlerts = db.prepare('SELECT COUNT(*) as count FROM products WHERE tenant_id = ? AND stock_enabled = 1 AND stock_qty <= low_stock_threshold').get(req.user.tenantId).count;

  res.json({
    sales,
    received,
    receivables: sales - received,
    expenses,
    profit: received - expenses,
    overdueInvoices: overdue,
    lowStockProducts: stockAlerts
  });
});

router.get('/tax', (req, res) => {
  const outputTax = db.prepare('SELECT COALESCE(SUM(tax_total),0) as total FROM invoices WHERE tenant_id = ?').get(req.user.tenantId).total;
  res.json({ outputTax });
});

router.get('/aging', (req, res) => {
  const rows = db.prepare(
    `SELECT id, invoice_no, due_date, grand_total, paid_amount,
            (grand_total - paid_amount) as balance
     FROM invoices
     WHERE tenant_id = ? AND (grand_total - paid_amount) > 0
     ORDER BY due_date ASC`
  ).all(req.user.tenantId);
  res.json(rows);
});

router.get('/pnl', (req, res) => {
  const sales = db.prepare('SELECT COALESCE(SUM(paid_amount),0) as total FROM invoices WHERE tenant_id = ?').get(req.user.tenantId).total;
  const expenses = db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE tenant_id = ?').get(req.user.tenantId).total;
  res.json({ revenue: sales, expenses, netProfit: sales - expenses });
});

router.get('/trends/monthly', (req, res) => {
  const salesByMonth = db.prepare(
    `SELECT strftime('%Y-%m', issue_date) as month, COALESCE(SUM(grand_total),0) as sales
     FROM invoices WHERE tenant_id = ? GROUP BY strftime('%Y-%m', issue_date) ORDER BY month`
  ).all(req.user.tenantId);

  const expensesByMonth = db.prepare(
    `SELECT strftime('%Y-%m', spent_on) as month, COALESCE(SUM(amount),0) as expenses
     FROM expenses WHERE tenant_id = ? GROUP BY strftime('%Y-%m', spent_on) ORDER BY month`
  ).all(req.user.tenantId);

  res.json({ salesByMonth, expensesByMonth });
});

export default router;
