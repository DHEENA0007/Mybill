# MyBill SaaS Billing Platform

Comprehensive multi-tenant billing SaaS implementation.

- **Backend**: Node.js + Express + SQLite + JWT + RBAC
- **Frontend**: React (Vite) + Tailwind CSS v4

## Features implemented

### Tenant portal
- Authentication: register/login/profile (`JWT`)
- Customer management + customer statement/ledger endpoint
- Product/service catalog + low-stock alert endpoint
- Invoice engine (GST/non-GST/proforma/credit/debit/quotation/recurring)
- Invoice line items, tax/discount totals, payment recording
- Invoice export/email queue placeholders for PDF/email delivery integration
- Expense management
- Reporting endpoints (summary, aging, tax, P&L, monthly trends)
- Team/user management with role-based actions
- Support tickets
- Subscription status + renewal/cancel workflows
- Advanced invoice template customization (colors, typography, columns, notes, spacing, watermark)

### Super Admin portal
- SaaS overview metrics (subscribers, MRR, yearly revenue, failed payments)
- Subscriber management and status controls
- Coupon creation/listing
- Announcement broadcasting and listing
- Refund request management/statusing
- Platform settings (maintenance mode, pricing, trial days)
- System health endpoint
- Global ticket monitoring and status updates
- Activity log access

### Platform operations
- Multi-tenant data model with isolation by `tenant_id`
- Activity logging
- Payment webhook endpoint for renewal state updates
- Maintenance-mode request gating

## Project structure

- `backend/` Express API and SQL schema
- `frontend/` React app and portal UI pages

## Run backend

```bash
cd backend
npm install
npm run dev
```

API root: `http://localhost:4000/api`

## Run frontend

```bash
cd frontend
npm install
npm run dev
```

App URL: `http://localhost:5173`

## Default super admin
- Email: `admin@mybill.app`
- Password hash is pre-seeded in `backend/src/server.js` (replace in production)
