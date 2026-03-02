import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import db, { migrate } from './db.js';
import authRoutes from './routes/auth.routes.js';
import customerRoutes from './routes/customer.routes.js';
import productRoutes from './routes/product.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import templateRoutes from './routes/template.routes.js';
import superAdminRoutes from './routes/super-admin.routes.js';
import expenseRoutes from './routes/expense.routes.js';
import reportRoutes from './routes/report.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import supportRoutes from './routes/support.routes.js';
import userRoutes from './routes/user.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import { requireAuth } from './middleware/auth.js';

migrate();

const superAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@mybill.app');
if (!superAdmin) {
  db.prepare(
    'INSERT INTO users (tenant_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)'
  ).run(null, 'Super Admin', 'admin@mybill.app', '$2a$10$w4l6H0uQ8P8d0vJ5DcM0kuxN6J2fM57Pzgoq3x9kpBv9LQmkDuIj2', 'super_admin');
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use((req, res, next) => {
  if (req.path.startsWith('/health') || req.path.startsWith('/api/super-admin') || req.path.startsWith('/api/auth')) return next();
  const settings = db.prepare('SELECT maintenance_mode FROM app_settings WHERE id = 1').get();
  if (settings?.maintenance_mode) return res.status(503).json({ message: 'System under maintenance' });
  return next();
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);

app.use('/api/customers', requireAuth, customerRoutes);
app.use('/api/products', requireAuth, productRoutes);
app.use('/api/invoices', requireAuth, invoiceRoutes);
app.use('/api/templates', requireAuth, templateRoutes);
app.use('/api/expenses', requireAuth, expenseRoutes);
app.use('/api/reports', requireAuth, reportRoutes);
app.use('/api/subscription', requireAuth, subscriptionRoutes);
app.use('/api/support', requireAuth, supportRoutes);
app.use('/api/users', requireAuth, userRoutes);
app.use('/api/super-admin', requireAuth, superAdminRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API running on ${PORT}`));
