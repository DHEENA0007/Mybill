import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFinancialReport } from '../../api/reports';
import Card, { CardHeader } from '../../components/UI/Card';
import { formatCurrency } from '../../utils/formatters';
import { REPORT_PERIODS } from '../../utils/constants';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
  ComposedChart, Line, ReferenceLine,
} from 'recharts';
import { PageLoader } from '../../components/UI/LoadingSpinner';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';

const PALETTE = ['#4f46e5', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#ec4899'];

// ── Waterfall bar shape ──────────────────────────────────────────────────────
function WaterfallBar(props) {
  const { x, y, width, height, fill, payload } = props;
  if (!height || height <= 0) return null;
  return (
    <g>
      <defs>
        <linearGradient id={`wf-${payload?.name?.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity={1} />
          <stop offset="100%" stopColor={fill} stopOpacity={0.75} />
        </linearGradient>
      </defs>
      <rect x={x + 4} y={y} width={width - 8} height={height}
        rx={6} fill={`url(#wf-${payload?.name?.replace(/\s/g, '')})`} />
      {height > 20 && (
        <text x={x + width / 2} y={y + height / 2 + 4}
          textAnchor="middle" fill="white" fontSize={10} fontWeight={700}>
          {formatCurrency(payload?.actualValue || 0)}
        </text>
      )}
    </g>
  );
}

// ── Financial Sankey Flow (3-level proportional bars) ─────────────────────────
function FinancialFlow({ rev, cogs, credit, profit }) {
  if (!rev || rev <= 0) return (
    <p className="text-sm text-gray-400 text-center py-8">No revenue data</p>
  );
  const cogsP = (cogs / rev) * 100;
  const gpP = 100 - cogsP;
  const creditP = (credit / rev) * 100;
  const profitP = Math.max(0, gpP - creditP);

  const rows = [
    {
      label: 'Total Revenue',
      segments: [{ name: 'Revenue', pct: 100, value: rev, color: '#4f46e5' }],
    },
    {
      label: 'Cost Split',
      segments: [
        { name: 'COGS', pct: cogsP, value: cogs, color: '#ef4444' },
        { name: 'Gross Profit', pct: gpP, value: rev - cogs, color: '#10b981' },
      ],
    },
    {
      label: 'Profit Split',
      segments: [
        { name: 'COGS', pct: cogsP, value: cogs, color: '#ef444430', textColor: 'transparent' },
        { name: 'Credits', pct: creditP, value: credit, color: '#f59e0b' },
        { name: 'Net Profit', pct: profitP, value: profit, color: '#059669' },
      ],
    },
  ];

  return (
    <div className="space-y-5 py-2">
      {rows.map((row, ri) => (
        <div key={row.label}>
          <p className="text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wide">{row.label}</p>
          <div className="flex h-12 rounded-xl overflow-hidden gap-[2px]">
            {row.segments.filter(s => s.pct > 0).map(seg => (
              <div
                key={seg.name + ri}
                title={seg.value > 0 ? `${seg.name}: ${formatCurrency(seg.value)} (${seg.pct.toFixed(1)}%)` : ''}
                className="flex items-center justify-center overflow-hidden transition-all flex-col"
                style={{
                  width: `${seg.pct}%`,
                  background: seg.color,
                  minWidth: seg.pct > 4 ? undefined : 0,
                }}
              >
                {seg.pct > 10 && seg.textColor !== 'transparent' && (
                  <>
                    <p className="text-white text-xs font-bold leading-tight">{seg.name}</p>
                    {seg.pct > 18 && (
                      <p className="text-white/75 text-[9px]">{formatCurrency(seg.value)}</p>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
          {/* Connector arrow */}
          {ri < rows.length - 1 && (
            <div className="flex justify-center mt-1.5">
              <span className="text-gray-300 text-base">↓</span>
            </div>
          )}
        </div>
      ))}
      {/* Summary legend */}
      <div className="flex flex-wrap gap-3 pt-1">
        {[
          { name: 'Revenue', color: '#4f46e5', value: rev },
          { name: 'COGS', color: '#ef4444', value: cogs },
          { name: 'Credits', color: '#f59e0b', value: credit },
          { name: 'Net Profit', color: '#059669', value: profit },
        ].map(d => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
            <span className="text-xs text-gray-500">{d.name}: <strong className="text-gray-700">{formatCurrency(d.value)}</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Dumbbell chart (Revenue vs Profit per month) ─────────────────────────────
function DumbbellChart({ data }) {
  if (!data?.length) return <p className="text-sm text-gray-400 text-center py-8">No monthly data</p>;
  const maxVal = Math.max(...data.map(d => d.revenue || 0), 1);

  return (
    <div className="space-y-3 py-2">
      {/* Legend */}
      <div className="flex items-center gap-5 text-xs pb-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-indigo-600 border-2 border-white shadow" />
          <span className="text-gray-500">Revenue</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow" />
          <span className="text-gray-500">Profit</span>
        </div>
        <div className="ml-auto text-gray-400">Margin %</div>
      </div>

      {data.map(d => {
        const revPct = (d.revenue / maxVal) * 100;
        const profPct = (Math.max(0, d.profit) / maxVal) * 100;
        const margin = d.revenue > 0 ? ((d.profit / d.revenue) * 100).toFixed(0) : 0;
        return (
          <div key={d.month} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-10 text-right flex-shrink-0 font-medium">{d.month}</span>
            <div className="flex-1 relative h-7">
              {/* Track */}
              <div className="absolute inset-0 flex items-center">
                <div className="w-full h-px bg-gray-100" />
              </div>
              {/* Gradient fill between dots */}
              <div
                className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full"
                style={{
                  left: `${profPct}%`,
                  width: `${Math.max(0, revPct - profPct)}%`,
                  background: 'linear-gradient(to right, #10b981, #4f46e5)',
                  opacity: 0.35,
                }}
              />
              {/* Profit dot */}
              {profPct > 0 && (
                <div
                  title={`Profit: ${formatCurrency(d.profit)}`}
                  className="absolute w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-md top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 cursor-pointer hover:scale-125 transition-transform"
                  style={{ left: `${profPct}%` }}
                />
              )}
              {/* Revenue dot */}
              <div
                title={`Revenue: ${formatCurrency(d.revenue)}`}
                className="absolute w-4 h-4 rounded-full bg-indigo-600 border-2 border-white shadow-md top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 cursor-pointer hover:scale-125 transition-transform"
                style={{ left: `${revPct}%` }}
              />
            </div>
            <span className={`text-xs font-bold w-9 text-right flex-shrink-0 ${
              parseFloat(margin) >= 25 ? 'text-emerald-600'
                : parseFloat(margin) >= 12 ? 'text-amber-600'
                  : 'text-red-500'
            }`}>
              {margin}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function FinancialReport() {
  const [period, setPeriod] = useState('month');
  const { data, isLoading } = useQuery({
    queryKey: ['reports-financial', period],
    queryFn: () => getFinancialReport({ period }).then(r => r.data),
  });
  if (isLoading) return <PageLoader />;

  const rev = data?.revenue || 0;
  const cogs = data?.cogs || 0;
  const credit = data?.customer_credit || 0;
  const profit = data?.gross_profit || 0;
  const profitMargin = rev > 0 ? ((profit / rev) * 100).toFixed(1) : 0;

  // Waterfall data
  const waterfallData = [
    { name: 'Revenue', spacer: 0, bar: rev, actualValue: rev, fill: '#4f46e5' },
    { name: 'After COGS', spacer: rev - cogs, bar: cogs, actualValue: cogs, fill: '#ef4444' },
    { name: 'After Credits', spacer: rev - cogs - credit, bar: credit, actualValue: credit, fill: '#f59e0b' },
    { name: 'Net Profit', spacer: 0, bar: profit, actualValue: profit, fill: '#10b981' },
  ];

  // Donut
  const donutData = [
    { name: 'COGS', value: cogs },
    { name: 'Gross Profit', value: Math.max(0, profit) },
    { name: 'Credits', value: credit },
  ].filter(d => d.value > 0);

  // Mirror/diverging bar data (revenue up, COGS mirrored down)
  const mirrorData = (data?.monthly_breakdown || []).map(m => ({
    month: m.month,
    revenue: m.revenue || 0,
    cogsDown: -(m.cogs || 0),
    profit: m.profit ?? ((m.revenue || 0) - (m.cogs || 0)),
  }));

  // Dumbbell data
  const dumbbellData = (data?.monthly_breakdown || []).map(m => ({
    month: m.month,
    revenue: m.revenue || 0,
    profit: m.profit ?? ((m.revenue || 0) - (m.cogs || 0)),
  }));

  const stats = [
    { label: 'Revenue', value: formatCurrency(rev), color: 'text-indigo-600', bg: 'bg-indigo-50', icon: TrendingUp },
    { label: 'COGS', value: formatCurrency(cogs), color: 'text-amber-600', bg: 'bg-amber-50', icon: TrendingDown },
    { label: 'Gross Profit', value: formatCurrency(profit), color: 'text-emerald-600', bg: 'bg-emerald-50', icon: DollarSign },
    { label: 'Customer Credit', value: formatCurrency(credit), color: 'text-red-500', bg: 'bg-red-50', icon: AlertCircle },
  ];

  return (
    <div className="space-y-6">
      {/* Filters + badges */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <select value={period} onChange={e => setPeriod(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          {REPORT_PERIODS.filter(p => p.value !== 'today' && p.value !== 'custom').map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
            <span className="text-xs text-emerald-600 font-medium">Profit Margin</span>
            <span className="text-base font-bold text-emerald-700">{profitMargin}%</span>
          </div>
          <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2">
            <span className="text-xs text-indigo-600 font-medium">Revenue</span>
            <span className="text-base font-bold text-indigo-700">{formatCurrency(rev)}</span>
          </div>
        </div>
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

      {/* Row 1 — Waterfall */}
      <Card>
        <CardHeader title="Financial Waterfall" subtitle="Revenue → COGS → Credits → Net Profit flow" />
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={waterfallData} margin={{ top: 20, right: 20, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 600, fill: '#374151' }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload.find(p => p.dataKey === 'bar');
              if (!d) return null;
              return (
                <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
                  <p className="font-bold text-gray-700 mb-1">{d.payload.name}</p>
                  <p style={{ color: d.payload.fill }}>{formatCurrency(d.payload.actualValue)}</p>
                </div>
              );
            }} />
            <Bar dataKey="spacer" stackId="wf" fill="transparent" stroke="none" legendType="none" />
            <Bar dataKey="bar" stackId="wf" shape={<WaterfallBar />} legendType="none">
              {waterfallData.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-6 mt-1 flex-wrap">
          {waterfallData.map(d => (
            <div key={d.name} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ background: d.fill }} />
              <span className="text-xs text-gray-500">{d.name}: {formatCurrency(d.actualValue)}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Row 2 — Financial Flow Sankey + Donut */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader title="Financial Flow" subtitle="3-level proportional breakdown — Revenue → Cost Split → Profit Split" />
          <FinancialFlow rev={rev} cogs={cogs} credit={credit} profit={profit} />
        </Card>

        <Card>
          <CardHeader title="Revenue Distribution" subtitle="Donut breakdown" />
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={62} outerRadius={92}
                dataKey="value" nameKey="name" paddingAngle={5}>
                {donutData.map((_, i) => <Cell key={i} fill={PALETTE[i + 1]} />)}
              </Pie>
              <Tooltip formatter={v => formatCurrency(v)} />
              <Legend iconType="circle" iconSize={8} formatter={v => <span className="text-xs">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Row 3 — Mirror bar + Dumbbell */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Revenue vs COGS — Diverging Mirror" subtitle="Revenue grows up · COGS mirrors below · profit line" />
          {mirrorData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={mirrorData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }}
                  tickFormatter={v => `₹${(Math.abs(v) / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v, name) => [formatCurrency(Math.abs(v)), name]} />
                <Legend />
                <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />
                <Bar dataKey="revenue" name="Revenue" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                <Bar dataKey="cogsDown" name="COGS" fill="#ef4444" radius={[0, 0, 6, 6]} />
                <Line type="monotone" dataKey="profit" name="Profit" stroke="#10b981" strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10b981', stroke: 'white', strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-12">No monthly data</p>
          )}
        </Card>

        <Card>
          <CardHeader title="Revenue vs Profit — Dumbbell Chart" subtitle="Dot gap = profit margin · color = margin %" />
          <DumbbellChart data={dumbbellData} />
        </Card>
      </div>

      {/* Row 4 — Supplier pending */}
      {(data?.supplier_pending?.length > 0) && (
        <Card>
          <CardHeader title="Supplier Pending Payments" subtitle="Outstanding dues" />
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {(() => {
              const maxP = Math.max(...data.supplier_pending.map(s => s.pending || 0), 1);
              return data.supplier_pending.map(s => (
                <div key={s.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-medium text-gray-800">{s.name}</p>
                    <span className="font-bold text-red-600 text-sm">{formatCurrency(s.pending)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="h-2 bg-gradient-to-r from-red-400 to-red-600 rounded-full"
                      style={{ width: `${Math.round((s.pending / maxP) * 100)}%` }} />
                  </div>
                </div>
              ));
            })()}
          </div>
        </Card>
      )}
    </div>
  );
}
