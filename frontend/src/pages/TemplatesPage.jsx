import { useEffect, useState } from 'react';
import client from '../api/client';

const defaultColumns = [
  { key: 'item', label: 'Item', width: 220, align: 'left', visible: true },
  { key: 'qty', label: 'Qty', width: 80, align: 'right', visible: true },
  { key: 'price', label: 'Price', width: 120, align: 'right', visible: true },
  { key: 'tax', label: 'Tax %', width: 100, align: 'right', visible: true },
  { key: 'total', label: 'Total', width: 120, align: 'right', visible: true }
];

const TemplatesPage = () => {
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState({
    name: 'Default Template',
    headerColor: '#1e3a8a',
    accentColor: '#2563eb',
    borderColor: '#cbd5e1',
    logoSize: 80,
    fontSize: 12,
    rowSpacing: 6,
    watermarkText: '',
    paymentTerms: 'Payment due within 15 days.',
    returnPolicy: 'Goods once sold cannot be returned.',
    legalNotes: 'Subject to local jurisdiction.',
    footerNotes: 'Thank you for your business',
    columns: defaultColumns
  });

  const load = () => client.get('/templates').then((res) => setTemplates(res.data));
  useEffect(() => { load(); }, []);

  const saveTemplate = async () => {
    await client.post('/templates', {
      name: form.name,
      isDefault: true,
      config: {
        logoSize: Number(form.logoSize),
        headerColor: form.headerColor,
        accentColor: form.accentColor,
        borderColor: form.borderColor,
        fontSize: Number(form.fontSize),
        rowSpacing: Number(form.rowSpacing),
        watermarkText: form.watermarkText,
        paymentTerms: form.paymentTerms,
        returnPolicy: form.returnPolicy,
        legalNotes: form.legalNotes,
        footerNotes: form.footerNotes,
        columns: form.columns
      }
    });
    load();
    alert('Template saved');
  };

  const updateCol = (idx, key, value) => {
    const next = [...form.columns];
    next[idx] = { ...next[idx], [key]: key === 'width' ? Number(value) : value };
    setForm({ ...form, columns: next });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3 rounded bg-white p-4 shadow-sm">
          <h2 className="text-xl font-semibold">Advanced Invoice Customization</h2>
          <input className="w-full rounded border p-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <label>Header <input type="color" value={form.headerColor} onChange={(e) => setForm({ ...form, headerColor: e.target.value })} /></label>
            <label>Accent <input type="color" value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} /></label>
            <label>Border <input type="color" value={form.borderColor} onChange={(e) => setForm({ ...form, borderColor: e.target.value })} /></label>
            <label>Logo size <input className="w-full" type="number" value={form.logoSize} onChange={(e) => setForm({ ...form, logoSize: e.target.value })} /></label>
            <label>Font size <input className="w-full" type="number" value={form.fontSize} onChange={(e) => setForm({ ...form, fontSize: e.target.value })} /></label>
            <label>Row spacing <input className="w-full" type="number" value={form.rowSpacing} onChange={(e) => setForm({ ...form, rowSpacing: e.target.value })} /></label>
          </div>
          <input className="w-full rounded border p-2" placeholder="Watermark" value={form.watermarkText} onChange={(e) => setForm({ ...form, watermarkText: e.target.value })} />
          <textarea className="w-full rounded border p-2" placeholder="Payment terms" value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} />
          <textarea className="w-full rounded border p-2" placeholder="Return policy" value={form.returnPolicy} onChange={(e) => setForm({ ...form, returnPolicy: e.target.value })} />
          <textarea className="w-full rounded border p-2" placeholder="Legal notes" value={form.legalNotes} onChange={(e) => setForm({ ...form, legalNotes: e.target.value })} />
          <textarea className="w-full rounded border p-2" value={form.footerNotes} onChange={(e) => setForm({ ...form, footerNotes: e.target.value })} />
          <button className="rounded bg-indigo-700 px-3 py-2 text-white" onClick={saveTemplate}>Save Template</button>
        </div>

        <div className="rounded border bg-white p-5">
          <div className="rounded-t p-3 text-white" style={{ backgroundColor: form.headerColor }}>
            <p className="font-semibold">INVOICE</p>
          </div>
          <div className="border-x p-3" style={{ borderColor: form.borderColor }}>
            <div className="h-8 rounded" style={{ backgroundColor: form.accentColor }} />
            <p className="mt-3 text-sm" style={{ fontSize: `${form.fontSize}px` }}>Watermark: {form.watermarkText || 'N/A'}</p>
            <table className="mt-3 w-full text-xs">
              <thead><tr>{form.columns.filter((c) => c.visible).map((c) => <th key={c.key} style={{ width: `${c.width}px`, textAlign: c.align }}>{c.label}</th>)}</tr></thead>
            </table>
          </div>
          <div className="rounded-b border p-3 text-sm text-slate-600">
            <p>{form.paymentTerms}</p>
            <p>{form.returnPolicy}</p>
            <p>{form.legalNotes}</p>
            <p>{form.footerNotes}</p>
          </div>
        </div>
      </div>

      <div className="rounded bg-white p-4 shadow-sm">
        <h3 className="mb-2 font-semibold">Table Columns</h3>
        <div className="space-y-2">
          {form.columns.map((col, idx) => (
            <div key={col.key} className="grid grid-cols-4 gap-2">
              <input className="rounded border p-2" value={col.label} onChange={(e) => updateCol(idx, 'label', e.target.value)} />
              <input className="rounded border p-2" type="number" value={col.width} onChange={(e) => updateCol(idx, 'width', e.target.value)} />
              <select className="rounded border p-2" value={col.align} onChange={(e) => updateCol(idx, 'align', e.target.value)}><option value="left">left</option><option value="center">center</option><option value="right">right</option></select>
              <select className="rounded border p-2" value={String(col.visible)} onChange={(e) => updateCol(idx, 'visible', e.target.value === 'true')}><option value="true">visible</option><option value="false">hidden</option></select>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded bg-white p-4 shadow-sm">
        <h3 className="font-semibold">Saved Templates</h3>
        {templates.map((t) => <div key={t.id} className="border-b py-2 last:border-0">{t.name} {t.is_default ? '(default)' : ''}</div>)}
      </div>
    </div>
  );
};

export default TemplatesPage;
