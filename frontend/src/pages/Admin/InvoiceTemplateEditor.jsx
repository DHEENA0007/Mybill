import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Star, Upload, ChevronDown, ChevronUp, Braces, X, Check,
} from 'lucide-react';
import {
  getTemplate, createTemplate, updateTemplate, setDefaultTemplate, uploadLogo,
} from '../../api/templates';
import InvoiceRenderer, { DEFAULT_CONFIG, SAMPLE_INVOICE, VARIABLE_GROUPS } from '../../components/InvoiceRenderer';
import toast from 'react-hot-toast';

// ── Shared sub-components ──────────────────────────────────────

function Section({ title, children, defaultOpen = false, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">{title}</span>
          {badge && <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-medium">{badge}</span>}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="p-4 space-y-4 bg-white">{children}</div>}
    </div>
  );
}

function Toggle({ label, hint, value, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <div>
        <span className="text-sm text-gray-700">{label}</span>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 ${value ? 'bg-indigo-600' : 'bg-gray-200'}`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 mt-0.5 ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    </label>
  );
}

function ColorPicker({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded border border-gray-300" style={{ background: value }} />
        <span className="text-xs text-gray-500 font-mono w-16">{value}</span>
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="h-7 w-10 rounded cursor-pointer border border-gray-300 p-0.5" />
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function NumberField({ label, value, onChange, min, max, suffix }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <input type="number" value={value} onChange={e => onChange(Number(e.target.value))} min={min} max={max}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        {suffix && <span className="text-xs text-gray-400">{suffix}</span>}
      </div>
    </div>
  );
}

// ── Variable builder text input ────────────────────────────────
function VarField({ label, value, onChange, multiline = false, rows = 2, hint }) {
  const inputRef = useRef();
  const [open, setOpen] = useState(false);
  const dropRef = useRef();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (!dropRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const insertVar = (key) => {
    const el = inputRef.current;
    if (!el) { onChange((value || '') + `{{${key}}}`); setOpen(false); return; }
    const s = el.selectionStart ?? (value || '').length;
    const e = el.selectionEnd ?? (value || '').length;
    const next = (value || '').slice(0, s) + `{{${key}}}` + (value || '').slice(e);
    onChange(next);
    setOpen(false);
    setTimeout(() => {
      el.focus();
      const pos = s + key.length + 4;
      el.setSelectionRange(pos, pos);
    }, 0);
  };

  const cls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono placeholder-gray-400';

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div>
          <span className="text-xs font-medium text-gray-500">{label}</span>
          {hint && <span className="text-xs text-gray-400 ml-1.5">({hint})</span>}
        </div>
        <div className="relative" ref={dropRef}>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded-md transition-colors font-medium"
          >
            <Braces className="w-3 h-3" /> Insert Variable
          </button>

          {open && (
            <div className="absolute right-0 top-7 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl w-64 overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600">Available Variables</span>
                <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto p-2">
                {VARIABLE_GROUPS.map(g => (
                  <div key={g.label} className="mb-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 py-1">{g.label}</p>
                    {g.vars.map(v => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => insertVar(v.key)}
                        className="w-full flex items-center gap-2 px-2 py-2 hover:bg-indigo-50 rounded-lg text-left transition-colors group"
                      >
                        <code className="text-xs bg-indigo-50 group-hover:bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono flex-shrink-0 transition-colors">
                          {`{{${v.key}}}`}
                        </code>
                        <span className="text-xs text-gray-500">{v.desc}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {multiline ? (
        <textarea
          ref={inputRef}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          rows={rows}
          className={cls}
          placeholder="Type text or click 'Insert Variable'…"
        />
      ) : (
        <input
          ref={inputRef}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className={cls}
          placeholder="Type text or click 'Insert Variable'…"
        />
      )}
    </div>
  );
}

// ── Plain text field (no variable builder) ─────────────────────
function PlainField({ label, value, onChange, type = 'text', multiline = false, rows = 2 }) {
  const cls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      {multiline
        ? <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows} className={cls} />
        : <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} className={cls} />}
    </div>
  );
}

// ── Main Editor Page ───────────────────────────────────────────
export default function InvoiceTemplateEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state: navState } = useLocation();
  const qc = useQueryClient();
  const isEdit = !!id;
  const logoInputRef = useRef();

  const [name, setName] = useState(navState?.name || 'New Template');
  const [config, setConfig] = useState(navState?.preset ? { ...DEFAULT_CONFIG, ...navState.preset } : { ...DEFAULT_CONFIG });
  const [pendingLogo, setPendingLogo] = useState(null);
  const [existingLogoUrl, setExistingLogoUrl] = useState(null);
  const [saved, setSaved] = useState(false);
  const [savedId, setSavedId] = useState(null);

  const cfg = useCallback((key, val) => setConfig(c => ({ ...c, [key]: val })), []);

  // Load template if editing
  const { isLoading: loadingTpl } = useQuery({
    queryKey: ['invoice-template', id],
    queryFn: () => getTemplate(id).then(r => r.data),
    enabled: isEdit,
    onSuccess: (tpl) => {
      setName(tpl.name);
      setConfig({ ...DEFAULT_CONFIG, ...tpl.config });
      setExistingLogoUrl(tpl.logo_url || null);
      setSavedId(tpl.id);
    },
  });

  const saveMut = useMutation({
    mutationFn: async ({ name, template_type, config }) => {
      let tpl;
      if (isEdit) {
        tpl = await updateTemplate(id, { name, template_type, config });
      } else {
        tpl = await createTemplate({ name, template_type, config });
      }
      const tplId = tpl.data.id;
      if (pendingLogo?.file) {
        await uploadLogo(tplId, pendingLogo.file);
      }
      return tpl.data;
    },
    onSuccess: (tpl) => {
      toast.success(isEdit ? 'Template saved' : 'Template created');
      qc.invalidateQueries(['invoice-templates']);
      setSaved(true);
      setSavedId(tpl.id);
      if (!isEdit) {
        navigate(`/admin/invoice-templates/${tpl.id}/edit`, { replace: true });
      }
    },
    onError: () => toast.error('Failed to save'),
  });

  const defaultMut = useMutation({
    mutationFn: () => setDefaultTemplate(savedId || id),
    onSuccess: () => { toast.success('Set as default template'); qc.invalidateQueries(['invoice-templates']); },
  });

  const handleLogoFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingLogo({ file, url: URL.createObjectURL(file) });
  };

  const currentLogoUrl = pendingLogo?.url || existingLogoUrl || null;

  if (isEdit && loadingTpl) {
    return <div className="flex items-center justify-center h-64 text-sm text-gray-400">Loading template…</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">

      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <button
          onClick={() => navigate('/admin/invoice-templates')}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="flex-1 max-w-xs border-0 border-b-2 border-transparent focus:border-indigo-500 px-1 py-0.5 text-sm font-semibold text-gray-800 focus:outline-none transition-colors bg-transparent"
          placeholder="Template Name"
        />
        
        <div className="ml-4 flex items-center gap-2 border-l border-gray-200 pl-4">
          <span className="text-sm font-medium text-gray-500">Type:</span>
          <select
            value={config.template_type || 'nontax'}
            onChange={(e) => cfg('template_type', e.target.value)}
            className="border-none bg-transparent text-sm font-medium text-gray-800 focus:ring-0 cursor-pointer outline-none"
          >
            <option value="tax">Tax Invoice</option>
            <option value="nontax">Non-Tax Invoice</option>
          </select>
        </div>

        <div className="ml-4 flex items-center gap-2 border-l border-gray-200 pl-4">
          <span className="text-sm font-medium text-gray-500">Paper:</span>
          <select
            value={config.paper_format || 'a4'}
            onChange={(e) => cfg('paper_format', e.target.value)}
            className="border-none bg-transparent text-sm font-medium text-gray-800 focus:ring-0 cursor-pointer outline-none"
          >
            <option value="a4">A4</option>
            <option value="thermal3inch">3-Inch Thermal</option>
          </select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {(savedId || isEdit) && (
            <button
              onClick={() => defaultMut.mutate()}
              disabled={defaultMut.isPending}
              className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Star className="w-4 h-4" /> Set Default
            </button>
          )}
          <button
            onClick={() => saveMut.mutate({ name, template_type: config.template_type || 'nontax', config })}
            disabled={saveMut.isPending}
            className="flex items-center gap-1.5 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-1.5 rounded-lg transition-colors disabled:opacity-60"
          >
            {saveMut.isPending ? 'Saving…' : saved ? <><Check className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" /> Save Template</>}
          </button>
        </div>
      </div>

      {/* ── Body: Settings + Preview ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Settings panel */}
        <div className="w-96 flex-shrink-0 border-r border-gray-200 overflow-y-auto bg-white">
          <div className="p-4 space-y-3">

            {/* ── Business Info ── */}
            <Section title="Business Info" defaultOpen badge="Variables supported">
              <VarField
                label="Business Name"
                value={config.business_name}
                onChange={v => cfg('business_name', v)}
                hint="shown in header"
              />
              <VarField
                label="Tagline / Subtitle"
                value={config.business_tagline}
                onChange={v => cfg('business_tagline', v)}
                hint="below business name"
              />
              <PlainField label="Phone" value={config.business_phone} onChange={v => cfg('business_phone', v)} />
              <PlainField label="Email" value={config.business_email} onChange={v => cfg('business_email', v)} />
              <PlainField label="Address" value={config.business_address} onChange={v => cfg('business_address', v)} multiline rows={2} />
              <PlainField label="GSTIN" value={config.business_gstin} onChange={v => cfg('business_gstin', v)} />
            </Section>

            {/* ── Logo ── */}
            <Section title="Logo">
              <Toggle label="Show Logo" value={!!config.show_logo} onChange={v => cfg('show_logo', v)} />
              {config.show_logo && (
                <>
                  <div>
                    <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoFile} className="hidden" />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current.click()}
                      className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl py-4 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      {currentLogoUrl ? 'Change Logo' : 'Upload Logo (PNG, SVG, JPG)'}
                    </button>
                    {currentLogoUrl && (
                      <div className="mt-3 flex items-center gap-3 bg-gray-50 rounded-lg p-2">
                        <img src={currentLogoUrl} alt="Logo" className="h-12 object-contain rounded" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-500">Logo preview</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setPendingLogo(null); setExistingLogoUrl(null); }}
                          className="text-xs text-red-500 hover:text-red-700 flex items-center gap-0.5"
                        >
                          <X className="w-3 h-3" /> Remove
                        </button>
                      </div>
                    )}
                  </div>
                  <SelectField
                    label="Logo Position"
                    value={config.logo_position || 'left'}
                    onChange={v => cfg('logo_position', v)}
                    options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]}
                  />
                  <NumberField
                    label="Logo Size"
                    value={config.logo_size || 72}
                    onChange={v => cfg('logo_size', v)}
                    min={32} max={200} suffix="px"
                  />
                </>
              )}
            </Section>

            {/* ── Appearance ── */}
            <Section title="Appearance & Fonts">
              <ColorPicker label="Primary Color" value={config.primary_color || '#4f46e5'} onChange={v => cfg('primary_color', v)} />
              <ColorPicker label="Background Accent" value={config.accent_color || '#f9fafb'} onChange={v => cfg('accent_color', v)} />
              <SelectField
                label="Font Family"
                value={config.font_family || 'system-ui, -apple-system, sans-serif'}
                onChange={v => cfg('font_family', v)}
                options={[
                  { value: 'system-ui, -apple-system, sans-serif', label: 'System Default' },
                  { value: 'Arial, Helvetica, sans-serif',          label: 'Arial' },
                  { value: 'Georgia, "Times New Roman", serif',     label: 'Georgia (Serif)' },
                  { value: '"Trebuchet MS", sans-serif',            label: 'Trebuchet MS' },
                  { value: 'Tahoma, Geneva, sans-serif',            label: 'Tahoma' },
                  { value: '"Courier New", Courier, monospace',     label: 'Courier New' },
                ]}
              />
              <NumberField label="Base Font Size" value={config.font_size_base || 13} onChange={v => cfg('font_size_base', v)} min={10} max={18} suffix="px" />
            </Section>

            {/* ── Invoice Header ── */}
            <Section title="Invoice Header" badge="Variables supported">
              <VarField
                label="Invoice Title"
                value={config.invoice_title}
                onChange={v => cfg('invoice_title', v)}
                hint="e.g. TAX INVOICE or INVOICE FOR {{customer_name}}"
              />
              <SelectField
                label="Header Alignment"
                value={config.header_align || 'center'}
                onChange={v => cfg('header_align', v)}
                options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]}
              />
            </Section>

            {/* ── Customer + Invoice Meta labels ── */}
            <Section title="Section Labels" badge="Variables supported">
              <VarField
                label='"Bill To" Label'
                value={config.bill_to_label}
                onChange={v => cfg('bill_to_label', v)}
                hint='e.g. "Bill To" or "Billed To: {{customer_name}}"'
              />
              <VarField
                label="Invoice Details Label"
                value={config.invoice_details_label}
                onChange={v => cfg('invoice_details_label', v)}
                hint='e.g. "Invoice Details" or "Invoice #{{invoice_number}}"'
              />
            </Section>

            {/* ── Sections visibility ── */}
            <Section title="Sections">
              <Toggle label="Customer Info Block" value={!!config.show_customer_section} onChange={v => cfg('show_customer_section', v)} />
              <Toggle label="Invoice Meta Block" value={!!config.show_invoice_meta} onChange={v => cfg('show_invoice_meta', v)} />
              <Toggle label="Notes" value={!!config.show_notes} onChange={v => cfg('show_notes', v)} />
              <Toggle label="Footer" value={!!config.show_footer} onChange={v => cfg('show_footer', v)} />
            </Section>

            {/* ── Items Table ── */}
            <Section title="Items Table">
              <Toggle label="Show SKU column" value={!!config.show_sku} onChange={v => cfg('show_sku', v)} />
              <Toggle label="Show Tax Rate % column" value={!!config.show_tax_rate} onChange={v => cfg('show_tax_rate', v)} />
              <Toggle label="Striped rows" hint="Alternate row background colors" value={!!config.table_striped} onChange={v => cfg('table_striped', v)} />
            </Section>

            {/* ── Summary ── */}
            <Section title="Summary Lines">
              <Toggle label="Subtotal" value={!!config.show_subtotal} onChange={v => cfg('show_subtotal', v)} />
              <Toggle label="Tax Amount" value={!!config.show_tax} onChange={v => cfg('show_tax', v)} />
              <Toggle label="Discount" value={!!config.show_discount} onChange={v => cfg('show_discount', v)} />
              <Toggle label="Amount Paid" value={!!config.show_paid} onChange={v => cfg('show_paid', v)} />
              <Toggle label="Balance Due" value={!!config.show_balance} onChange={v => cfg('show_balance', v)} />
            </Section>

            {/* ── Footer ── */}
            <Section title="Footer" badge="Variables supported">
              <VarField
                label="Footer Text"
                value={config.footer_text}
                onChange={v => cfg('footer_text', v)}
                multiline
                rows={3}
                hint='e.g. "Thank you {{customer_name}}! Invoice {{invoice_number}} — {{total_amount}}"'
              />
              <SelectField
                label="Footer Alignment"
                value={config.footer_align || 'center'}
                onChange={v => cfg('footer_align', v)}
                options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]}
              />
            </Section>

            {/* ── Variable Reference ── */}
            <Section title="All Available Variables">
              <p className="text-xs text-gray-400 -mt-1">Click any variable to copy it, then paste into any field marked "Variables supported".</p>
              <div className="space-y-3">
                {VARIABLE_GROUPS.map(g => (
                  <div key={g.label}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{g.label}</p>
                    <div className="grid grid-cols-1 gap-1">
                      {g.vars.map(v => (
                        <button
                          key={v.key}
                          type="button"
                          onClick={() => { navigator.clipboard.writeText(`{{${v.key}}}`); toast.success(`Copied {{${v.key}}}`); }}
                          className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1.5 text-left group transition-colors w-full"
                        >
                          <code className="text-xs bg-indigo-50 group-hover:bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-mono flex-shrink-0">
                            {`{{${v.key}}}`}
                          </code>
                          <span className="text-xs text-gray-400">{v.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>

          </div>
        </div>

        {/* Right: Live preview */}
        <div className="flex-1 bg-gray-100 overflow-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2 z-10">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-gray-500 font-medium">Live Preview — updates as you type</span>
            <span className="text-xs text-gray-400 ml-2">· Using sample invoice data</span>
          </div>
          <div className="p-6">
            <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
              <InvoiceRenderer
                invoice={SAMPLE_INVOICE}
                template={{ config }}
                logoUrl={currentLogoUrl}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
