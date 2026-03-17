import { formatCurrency, formatDate } from '../utils/formatters';

export const DEFAULT_CONFIG = {
  // Business info
  business_name: 'BillPro',
  business_tagline: 'Billing & Inventory',
  business_phone: '',
  business_email: '',
  business_address: '',
  business_gstin: '',

  // Appearance
  primary_color: '#4f46e5',
  accent_color: '#f9fafb',
  font_family: 'system-ui, -apple-system, sans-serif',
  font_size_base: 13,

  // Logo
  show_logo: true,
  logo_position: 'left',
  logo_size: 72,

  // Header
  invoice_title: 'TAX INVOICE',
  header_align: 'center',

  // Custom labels
  bill_to_label: 'Bill To',
  invoice_details_label: 'Invoice Details',

  // Sections visibility
  show_customer_section: true,
  show_invoice_meta: true,
  show_notes: true,
  show_footer: true,

  // Items table
  show_sku: false,
  show_tax_rate: true,
  table_striped: true,

  // Summary
  show_subtotal: true,
  show_tax: true,
  show_discount: true,
  show_paid: true,
  show_balance: true,

  // Footer
  footer_text: 'Thank you for your business!',
  footer_align: 'center',
};

export const SAMPLE_INVOICE = {
  invoice_number: 'INV-20260317-0001',
  invoice_date: '2026-03-17',
  status: 'partial',
  customer_name: 'Sample Customer',
  customer_phone: '+91 98765 43210',
  customer_email: 'customer@example.com',
  customer_address: '123 Main Street, Chennai, Tamil Nadu',
  subtotal: 10000,
  tax_amount: 1800,
  discount_amount: 500,
  total_amount: 11300,
  paid_amount: 5000,
  balance_due: 6300,
  notes: 'Payment due within 30 days.',
  items: [
    { product_name: 'Product A', product_sku: 'SKU-001', quantity: 2, unit_price: 2500, tax_rate: 18, total_price: 5900 },
    { product_name: 'Product B', product_sku: 'SKU-002', quantity: 3, unit_price: 1500, tax_rate: 18, total_price: 5310 },
    { product_name: 'Product C', product_sku: 'SKU-003', quantity: 1, unit_price: 1000, tax_rate: 0, total_price: 1000 },
  ],
};

// ── Variable groups (shared with editor) ───────────────────────
export const VARIABLE_GROUPS = [
  {
    label: 'Invoice',
    vars: [
      { key: 'invoice_number', desc: 'Invoice number' },
      { key: 'invoice_date',   desc: 'Invoice date' },
      { key: 'status',         desc: 'Payment status' },
    ],
  },
  {
    label: 'Customer',
    vars: [
      { key: 'customer_name',    desc: 'Customer name' },
      { key: 'customer_phone',   desc: 'Phone' },
      { key: 'customer_email',   desc: 'Email' },
      { key: 'customer_address', desc: 'Address' },
    ],
  },
  {
    label: 'Amounts',
    vars: [
      { key: 'subtotal',         desc: 'Subtotal' },
      { key: 'tax_amount',       desc: 'Tax total' },
      { key: 'discount_amount',  desc: 'Discount' },
      { key: 'total_amount',     desc: 'Grand total' },
      { key: 'paid_amount',      desc: 'Amount paid' },
      { key: 'balance_due',      desc: 'Balance due' },
    ],
  },
  {
    label: 'Business',
    vars: [
      { key: 'business_name',    desc: 'Business name' },
      { key: 'business_tagline', desc: 'Tagline' },
      { key: 'business_phone',   desc: 'Business phone' },
      { key: 'business_email',   desc: 'Business email' },
      { key: 'business_address', desc: 'Business address' },
      { key: 'business_gstin',   desc: 'GSTIN number' },
    ],
  },
];

// ── Variable substitution ──────────────────────────────────────
function buildVarMap(inv, cfg) {
  return {
    invoice_number:    inv.invoice_number   || '',
    invoice_date:      formatDate(inv.invoice_date),
    status:            inv.status           || '',
    customer_name:     inv.customer_name    || 'Walk-in Customer',
    customer_phone:    inv.customer_phone   || '',
    customer_email:    inv.customer_email   || '',
    customer_address:  inv.customer_address || '',
    subtotal:          formatCurrency(inv.subtotal         || 0),
    tax_amount:        formatCurrency(inv.tax_amount       || 0),
    discount_amount:   formatCurrency(inv.discount_amount  || 0),
    total_amount:      formatCurrency(inv.total_amount     || 0),
    paid_amount:       formatCurrency(inv.paid_amount      || 0),
    balance_due:       formatCurrency(inv.balance_due      || 0),
    notes:             inv.notes            || '',
    business_name:     cfg.business_name    || '',
    business_tagline:  cfg.business_tagline || '',
    business_phone:    cfg.business_phone   || '',
    business_email:    cfg.business_email   || '',
    business_address:  cfg.business_address || '',
    business_gstin:    cfg.business_gstin   || '',
  };
}

export function substituteVars(text, vars) {
  if (!text) return text || '';
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : `{{${key}}}`
  );
}

// ── Status colors ──────────────────────────────────────────────
const STATUS_COLORS = {
  paid:      '#10b981',
  partial:   '#f59e0b',
  pending:   '#6b7280',
  cancelled: '#ef4444',
};

// ── Renderer ───────────────────────────────────────────────────
export default function InvoiceRenderer({ invoice, template, logoUrl }) {
  const cfg  = { ...DEFAULT_CONFIG, ...(template?.config || {}) };
  const inv  = invoice || SAMPLE_INVOICE;
  const vars = buildVarMap(inv, cfg);
  const sub  = (text) => substituteVars(text, vars);

  const primary = cfg.primary_color;
  const accent  = cfg.accent_color || '#f9fafb';
  const fs      = cfg.font_size_base || 13;

  const logoJustify =
    cfg.logo_position === 'center' ? 'center' :
    cfg.logo_position === 'right'  ? 'flex-end' : 'flex-start';

  const headerAlign = cfg.header_align || 'center';

  const columns = [
    { key: '#',            label: '#',          always: true  },
    { key: 'product_name', label: 'Product',     always: true  },
    { key: 'product_sku',  label: 'SKU',         show: cfg.show_sku },
    { key: 'quantity',     label: 'Qty',          always: true  },
    { key: 'unit_price',   label: 'Unit Price',   always: true  },
    { key: 'tax_rate',     label: 'Tax %',        show: cfg.show_tax_rate },
    { key: 'total_price',  label: 'Total',        always: true  },
  ].filter(c => c.always || c.show);

  const statusLabel = { paid: 'PAID', partial: 'PARTIAL', pending: 'PENDING', cancelled: 'CANCELLED' }[inv.status] || (inv.status || '').toUpperCase();
  const statusColor = STATUS_COLORS[inv.status] || '#6b7280';

  const bName    = sub(cfg.business_name);
  const bTag     = sub(cfg.business_tagline);
  const bPhone   = sub(cfg.business_phone);
  const bEmail   = sub(cfg.business_email);
  const bAddr    = sub(cfg.business_address);
  const bGstin   = sub(cfg.business_gstin);
  const title    = sub(cfg.invoice_title);
  const billTo   = sub(cfg.bill_to_label || 'Bill To');
  const invLabel = sub(cfg.invoice_details_label || 'Invoice Details');
  const footer   = sub(cfg.footer_text);

  return (
    <div style={{ fontFamily: cfg.font_family, color: '#1f2937', background: '#fff', padding: '36px', maxWidth: '800px', margin: '0 auto', fontSize: `${fs}px` }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '28px', paddingBottom: '20px', borderBottom: `2.5px solid ${primary}` }}>
        <div style={{ display: 'flex', justifyContent: logoJustify, marginBottom: '14px' }}>
          {cfg.show_logo && logoUrl
            ? <img src={logoUrl} alt="Logo" style={{ height: cfg.logo_size, objectFit: 'contain' }} />
            : cfg.show_logo
              ? (
                <div style={{ width: cfg.logo_size, height: cfg.logo_size, background: primary, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#fff', fontWeight: 800, fontSize: Math.round(cfg.logo_size * 0.38) }}>{(bName || 'B')[0]}</span>
                </div>
              ) : null}
        </div>

        <div style={{ textAlign: headerAlign }}>
          {bName    && <div style={{ fontSize: `${fs + 7}px`, fontWeight: 800, color: '#111827', lineHeight: 1.2 }}>{bName}</div>}
          {bTag     && <div style={{ fontSize: `${fs - 1}px`, color: '#6b7280', marginTop: '3px' }}>{bTag}</div>}
          {(bPhone || bEmail) && (
            <div style={{ fontSize: `${fs - 2}px`, color: '#6b7280', marginTop: '5px' }}>
              {bPhone}{bPhone && bEmail && ' · '}{bEmail}
            </div>
          )}
          {bAddr    && <div style={{ fontSize: `${fs - 2}px`, color: '#6b7280', marginTop: '2px' }}>{bAddr}</div>}
          {bGstin   && <div style={{ fontSize: `${fs - 2}px`, color: '#6b7280', marginTop: '2px' }}>GSTIN: {bGstin}</div>}
        </div>

        {title && (
          <div style={{ textAlign: 'center', marginTop: '18px' }}>
            <span style={{ fontSize: `${fs + 9}px`, fontWeight: 900, color: primary, letterSpacing: '2.5px', textTransform: 'uppercase' }}>
              {title}
            </span>
          </div>
        )}
      </div>

      {/* ── Customer + Invoice Meta ── */}
      {(cfg.show_customer_section || cfg.show_invoice_meta) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>
          {cfg.show_customer_section && (
            <div style={{ background: accent, borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: `${fs - 3}px`, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>{billTo}</div>
              <div style={{ fontWeight: 700, fontSize: `${fs + 1}px`, color: '#111827' }}>{inv.customer_name || 'Walk-in Customer'}</div>
              {inv.customer_phone   && <div style={{ fontSize: `${fs - 1}px`, color: '#6b7280', marginTop: '3px' }}>{inv.customer_phone}</div>}
              {inv.customer_email   && <div style={{ fontSize: `${fs - 1}px`, color: '#6b7280' }}>{inv.customer_email}</div>}
              {inv.customer_address && <div style={{ fontSize: `${fs - 1}px`, color: '#6b7280', marginTop: '3px', whiteSpace: 'pre-wrap' }}>{inv.customer_address}</div>}
            </div>
          )}

          {cfg.show_invoice_meta && (
            <div style={{ background: accent, borderRadius: '10px', padding: '14px', textAlign: 'right' }}>
              <div style={{ fontSize: `${fs - 3}px`, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>{invLabel}</div>
              <div style={{ fontWeight: 800, fontSize: `${fs + 3}px`, color: primary }}>{inv.invoice_number}</div>
              <div style={{ fontSize: `${fs - 1}px`, color: '#6b7280', marginTop: '4px' }}>Date: {formatDate(inv.invoice_date)}</div>
              <div style={{ display: 'inline-block', marginTop: '8px', padding: '3px 12px', borderRadius: '999px', fontSize: `${fs - 2}px`, fontWeight: 700, color: '#fff', background: statusColor }}>
                {statusLabel}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Items Table ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: `${fs}px`, marginBottom: '24px' }}>
        <thead>
          <tr style={{ background: primary }}>
            {columns.map(col => {
              const rightAlign = ['#', 'quantity', 'unit_price', 'tax_rate', 'total_price'].includes(col.key);
              return (
                <th key={col.key} style={{ padding: '10px 12px', textAlign: rightAlign ? 'right' : 'left', color: '#fff', fontSize: `${fs - 2}px`, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {col.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {(inv.items || []).map((item, i) => {
            const bg = cfg.table_striped ? (i % 2 === 0 ? '#f9fafb' : '#fff') : '#fff';
            return (
              <tr key={i} style={{ background: bg, borderBottom: '1px solid #f3f4f6' }}>
                {columns.map(col => {
                  let val;
                  if (col.key === '#')           val = i + 1;
                  else if (col.key === 'unit_price') val = formatCurrency(item.unit_price);
                  else if (col.key === 'total_price') val = formatCurrency(item.total_price);
                  else if (col.key === 'tax_rate')   val = `${item.tax_rate}%`;
                  else                               val = item[col.key] ?? '-';
                  const rightAlign = ['#', 'quantity', 'unit_price', 'tax_rate', 'total_price'].includes(col.key);
                  return (
                    <td key={col.key} style={{ padding: '10px 12px', textAlign: rightAlign ? 'right' : 'left', fontWeight: col.key === 'total_price' ? 700 : 400, color: col.key === '#' ? '#9ca3af' : '#374151' }}>
                      {val}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── Summary ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
        <div style={{ width: '280px', background: accent, borderRadius: '10px', padding: '16px' }}>
          {cfg.show_subtotal && <SRow label="Subtotal" value={formatCurrency(inv.subtotal)} fs={fs} />}
          {cfg.show_tax && Number(inv.tax_amount) > 0 && <SRow label="Tax" value={formatCurrency(inv.tax_amount)} fs={fs} />}
          {cfg.show_discount && Number(inv.discount_amount) > 0 && <SRow label="Discount" value={`-${formatCurrency(inv.discount_amount)}`} color="#10b981" fs={fs} />}
          <SRow label="Total" value={formatCurrency(inv.total_amount)} bold border primary={primary} fs={fs} />
          {cfg.show_paid && Number(inv.paid_amount) > 0 && <SRow label="Paid" value={formatCurrency(inv.paid_amount)} color="#10b981" fs={fs} />}
          {cfg.show_balance && Number(inv.balance_due) > 0 && <SRow label="Balance Due" value={formatCurrency(inv.balance_due)} color="#ef4444" bold fs={fs} />}
        </div>
      </div>

      {/* ── Notes ── */}
      {cfg.show_notes && inv.notes && (
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '14px', marginBottom: '16px' }}>
          <span style={{ fontSize: `${fs - 1}px`, fontWeight: 700, color: '#6b7280' }}>Notes: </span>
          <span style={{ fontSize: `${fs - 1}px`, color: '#374151' }}>{inv.notes}</span>
        </div>
      )}

      {/* ── Footer ── */}
      {cfg.show_footer && footer && (
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '14px', textAlign: cfg.footer_align || 'center', fontSize: `${fs - 1}px`, color: '#9ca3af' }}>
          {footer}
        </div>
      )}
    </div>
  );
}

function SRow({ label, value, bold, border, color, primary, fs = 13 }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderTop: border ? `2px solid ${primary}` : undefined, marginTop: border ? '6px' : undefined }}>
      <span style={{ fontSize: `${fs}px`, color: color || '#6b7280', fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontSize: `${fs}px`, color: color || '#111827', fontWeight: bold ? 700 : 600 }}>{value}</span>
    </div>
  );
}
