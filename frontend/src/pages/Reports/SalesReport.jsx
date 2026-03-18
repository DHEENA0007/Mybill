import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSalesReport } from '../../api/reports';
import Card, { CardHeader } from '../../components/UI/Card';
import { formatCurrency } from '../../utils/formatters';
import { REPORT_PERIODS } from '../../utils/constants';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine,
  PieChart, Pie, Legend,
  FunnelChart, Funnel, LabelList,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { PageLoader } from '../../components/UI/LoadingSpinner';
import { TrendingUp, FileText, CheckCircle, Clock } from 'lucide-react';

const PALETTE = [
  '#4f46e5', '#7c3aed', '#2563eb', '#0891b2', '#059669',
  '#d97706', '#dc2626', '#db2777', '#65a30d', '#0284c7',
];

// ── SVG Gauge ────────────────────────────────────────────────────────────────
function Gauge({ pct = 0, color, label, sublabel }) {
  const cx = 80, cy = 68, r = 52;
  const clamp = Math.min(1, Math.max(0, pct));
  const rad = (180 - clamp * 180) * Math.PI / 180;
  const ex = cx + r * Math.cos(rad), ey = cy - r * Math.sin(rad);
  const largeArc = clamp > 0.5 ? 1 : 0;
  const nx = cx + r * 0.72 * Math.cos(rad), ny = cy - r * 0.72 * Math.sin(rad);
  return (
    <svg viewBox="0 0 160 100" className="w-full max-w-[180px] mx-auto">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`}
        fill="none" stroke="#e2e8f0" strokeWidth={10} strokeLinecap="round" />
      {clamp > 0.01 && (
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 0 ${ex} ${ey}`}
          fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" />
      )}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#334155" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={5} fill="#334155" />
      <text x={cx} y={cy - 10} textAnchor="middle" fontSize={16} fontWeight="bold" fill="#0f172a">
        {Math.round(clamp * 100)}%
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={9} fill="#94a3b8">{label}</text>
      {sublabel && <text x={cx} y={cy + 26} textAnchor="middle" fontSize={8} fill="#cbd5e1">{sublabel}</text>}
    </svg>
  );
}

// ── Horizontal Lollipop custom bar shape ─────────────────────────────────────
function HLollipop(props) {
  const { x, y, width, height, fill } = props;
  if (!width || width <= 0) return null;
  const cy = y + height / 2;
  const endX = x + width;
  return (
    <g>
      <line x1={x} y1={cy} x2={Math.max(x, endX - 13)} y2={cy}
        stroke={fill} strokeWidth={2.5} strokeLinecap="round" opacity={0.45} />
      <circle cx={endX} cy={cy} r={13} fill={fill} stroke="white" strokeWidth={2.5} />
    </g>
  );
}

// ── Revenue Calendar Heatmap ──────────────────────────────────────────────────
function RevenueHeatmap({ dailySales }) {
  if (!dailySales?.length) return (
    <p className="text-sm text-gray-400 text-center py-10">No data for heatmap</p>
  );
  const maxVal = Math.max(...dailySales.map(d => d.total || 0), 1);
  const firstDate = new Date(dailySales[0]?.date);
  const startDow = isNaN(firstDate) ? 0 : firstDate.getDay();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  dailySales.forEach(d => cells.push({ date: d.date, value: d.total || 0, count: d.count || 0 }));
  while (cells.length % 7 !== 0) cells.push(null);

  const getColor = (v) => {
    if (!v) return '#f1f5f9';
    const t = v / maxVal;
    if (t < 0.15) return '#e0e7ff';
    if (t < 0.35) return '#c7d2fe';
    if (t < 0.55) return '#a5b4fc';
    if (t < 0.75) return '#818cf8';
    return '#4f46e5';
  };

  return (
    <div className="select-none">
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-center text-[10px] text-gray-400 font-semibold">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell, i) => (
          <div
            key={i}
            title={cell
              ? `${new Date(cell.date).toLocaleDateString('en', { day: '2-digit', month: 'short' })}: ${formatCurrency(cell.value)} · ${cell.count} invoice${cell.count !== 1 ? 's' : ''}`
              : ''}
            className="aspect-square rounded-lg transition-all duration-150 hover:scale-110 hover:shadow-md"
            style={{ background: cell ? getColor(cell.value) : 'transparent' }}
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-4 justify-end">
        <span className="text-[10px] text-gray-400">Less</span>
        {['#f1f5f9', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#4f46e5'].map((c, i) => (
          <div key={i} className="w-3.5 h-3.5 rounded-sm" style={{ background: c }} />
        ))}
        <span className="text-[10px] text-gray-400">More</span>
      </div>
    </div>
  );
}

export default function SalesReport() {
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['reports-sales', { period, startDate, endDate }],
    queryFn: () => getSalesReport({ period, start_date: startDate, end_date: endDate }).then(r => r.data),
  });

  if (isLoading) return <PageLoader />;

  const dailySales = data?.daily_sales || [];
  const avgRev = dailySales.length > 0
    ? dailySales.reduce((s, d) => s + (d.total || 0), 0) / dailySales.length
    : 0;

  // Histogram data with 3-point moving average
  const histData = dailySales.map((d, i, arr) => {
    const win = arr.slice(Math.max(0, i - 1), Math.min(arr.length, i + 2));
    const ma = win.reduce((s, w) => s + (w.total || 0), 0) / win.length;
    return {
      ...d,
      ma,
      label: new Date(d.date).toLocaleDateString('en', { day: '2-digit', month: 'short' }),
    };
  });

  // Lollipop data
  const lollipopData = (data?.top_products || []).slice(0, 10).map((p, i) => ({
    name: p.name?.length > 20 ? p.name.slice(0, 20) + '…' : p.name,
    value: p.revenue || 0,
    index: i,
  }));

  // Funnel data
  const funnelData = data?.status_breakdown
    ? Object.entries(data.status_breakdown)
        .map(([name, v], i) => ({
          value: v.count, amount: v.amount,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          fill: PALETTE[i % PALETTE.length],
        }))
        .sort((a, b) => b.value - a.value)
    : [];

  const totalRev = data?.total_revenue || 0;
  const paidRev = data?.paid_revenue || 0;
  const invoiceCount = data?.total_invoices || 0;
  const paidCount = funnelData.find(d => d.name.toLowerCase() === 'paid')?.value || 0;
  const collectionRate = totalRev > 0 ? paidRev / totalRev : 0;
  const paidInvoiceRate = invoiceCount > 0 ? paidCount / invoiceCount : 0;

  const radarData = (data?.top_products || []).slice(0, 6).map(p => ({
    subject: p.name?.length > 10 ? p.name.slice(0, 10) + '…' : p.name,
    value: p.revenue || 0,
  }));

  const stats = [
    { label: 'Total Revenue', value: formatCurrency(totalRev), color: 'text-indigo-600', bg: 'bg-indigo-50', icon: TrendingUp },
    { label: 'Total Invoices', value: invoiceCount, color: 'text-gray-800', bg: 'bg-gray-50', icon: FileText },
    { label: 'Paid', value: formatCurrency(paidRev), color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
    { label: 'Pending', value: formatCurrency(data?.pending_revenue || 0), color: 'text-red-500', bg: 'bg-red-50', icon: Clock },
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={period} onChange={e => setPeriod(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          {REPORT_PERIODS.filter(p => p.value !== 'quarter').map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        {period === 'custom' && (
          <>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(({ label, value, color, bg, icon: Icon }) => (
          <Card key={label}>
            <div className="flex items-start gap-3">
              <div className={`${bg} p-2.5 rounded-xl`}><Icon className={`w-5 h-5 ${color}`} /></div>
              <div><p className="text-xs text-gray-500 font-medium">{label}</p>
                <p className={`text-xl font-bold mt-0.5 ${color}`}>{value}</p></div>
            </div>
          </Card>
        ))}
      </div>

      {/* Row 1 — Histogram + Gauges */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Revenue Histogram"
            subtitle="Bar intensity = revenue magnitude · line = 3-day moving avg"
          />
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={histData} barSize={histData.length > 20 ? 5 : 9} margin={{ top: 8, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
                      <p className="font-semibold text-gray-700 mb-1">{label}</p>
                      <p className="text-indigo-600">Revenue: {formatCurrency(payload[0]?.value)}</p>
                      {payload[1] && <p className="text-purple-500">Trend: {formatCurrency(payload[1]?.value)}</p>}
                    </div>
                  );
                }}
              />
              <ReferenceLine y={avgRev} stroke="#94a3b8" strokeDasharray="4 3" strokeWidth={1.5}
                label={{ value: 'avg', position: 'insideTopRight', fontSize: 9, fill: '#94a3b8', dy: -4 }} />
              <Bar dataKey="total" name="Revenue" radius={[3, 3, 0, 0]}>
                {histData.map((d, i) => (
                  <Cell key={i} fill={
                    d.total >= avgRev * 1.5 ? '#3730a3'
                      : d.total >= avgRev * 1.1 ? '#4f46e5'
                        : d.total >= avgRev * 0.7 ? '#818cf8'
                          : d.total >= avgRev * 0.3 ? '#a5b4fc'
                            : '#c7d2fe'
                  } />
                ))}
              </Bar>
              <Line type="basis" dataKey="ma" name="Trend" stroke="#7c3aed" strokeWidth={2.5}
                dot={false} activeDot={{ r: 5, fill: '#7c3aed' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardHeader title="Collection Gauges" />
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="text-center">
              <Gauge pct={collectionRate} color="#4f46e5" label="Revenue Collected" sublabel="Paid / Total" />
            </div>
            <div className="text-center">
              <Gauge pct={paidInvoiceRate} color="#10b981" label="Invoice Paid Rate" sublabel="Paid / All" />
            </div>
          </div>
        </Card>
      </div>

      {/* Row 2 — Lollipop chart (full width) */}
      <Card>
        <CardHeader title="Top Products — Lollipop Chart" subtitle="Each dot represents revenue rank" />
        {lollipopData.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(200, lollipopData.length * 38)}>
            <ComposedChart data={lollipopData} layout="vertical" margin={{ left: 0, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
              <Tooltip formatter={v => formatCurrency(v)} />
              <Bar dataKey="value" name="Revenue" maxBarSize={28} shape={<HLollipop />} background={{ fill: '#f8fafc', radius: 6 }}>
                {lollipopData.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-400 text-center py-10">No product data</p>
        )}
      </Card>

      {/* Row 3 — Heatmap + Funnel */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Daily Revenue Heatmap" subtitle="Calendar grid — hover to inspect each day" />
          <RevenueHeatmap dailySales={dailySales} />
        </Card>

        <Card>
          <CardHeader title="Invoice Status Funnel" subtitle="Count by payment status" />
          {funnelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <FunnelChart>
                <Tooltip formatter={(v, name, { payload }) => [
                  `${v} invoices — ${formatCurrency(payload.amount)}`, payload.name
                ]} />
                <Funnel dataKey="value" data={funnelData} isAnimationActive>
                  <LabelList position="right" fill="#374151" stroke="none" dataKey="name"
                    style={{ fontSize: 12, fontWeight: 600 }} />
                  <LabelList position="center" fill="white" stroke="none" dataKey="value"
                    style={{ fontSize: 13, fontWeight: 700 }} />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-16">No status data</p>
          )}
        </Card>
      </div>

      {/* Row 4 — Radar + Donut */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Product Revenue Radar" subtitle="Top 6 comparison" />
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis tick={{ fontSize: 8 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Radar name="Revenue" dataKey="value" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.25}
                dot={{ r: 4, fill: '#4f46e5' }} />
              <Tooltip formatter={v => formatCurrency(v)} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardHeader title="Revenue Split" subtitle="Paid vs Pending donut" />
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Paid', value: paidRev },
                  { name: 'Pending', value: data?.pending_revenue || 0 },
                ]}
                cx="50%" cy="50%" innerRadius={68} outerRadius={100}
                dataKey="value" nameKey="name" paddingAngle={5}
              >
                <Cell fill="#4f46e5" />
                <Cell fill="#ef4444" />
              </Pie>
              <Tooltip formatter={v => formatCurrency(v)} />
              <Legend iconType="circle" iconSize={8} formatter={v => <span className="text-xs">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
