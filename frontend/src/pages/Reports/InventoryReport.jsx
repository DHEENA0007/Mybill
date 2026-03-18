import { useQuery } from '@tanstack/react-query';
import { getInventoryReport } from '../../api/reports';
import Card, { CardHeader } from '../../components/UI/Card';
import { formatCurrency } from '../../utils/formatters';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
  RadialBarChart, RadialBar, Legend,
  Treemap,
  PieChart, Pie,
} from 'recharts';
import { PageLoader } from '../../components/UI/LoadingSpinner';
import { Package, DollarSign, AlertTriangle, XCircle } from 'lucide-react';

const PALETTE = ['#4f46e5', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626', '#db2777', '#0284c7'];

// ── Treemap cell with gradient ───────────────────────────────────────────────
function InvTreeCell(props) {
  const { x, y, width, height, name, value, index } = props;
  const fill = PALETTE[index % PALETTE.length];
  if (width < 4 || height < 4) return null;
  return (
    <g>
      <defs>
        <linearGradient id={`itg${index}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity={0.92} />
          <stop offset="100%" stopColor={fill} stopOpacity={0.62} />
        </linearGradient>
      </defs>
      <rect x={x + 2} y={y + 2} width={Math.max(0, width - 4)} height={Math.max(0, height - 4)}
        rx={8} fill={`url(#itg${index})`} stroke="white" strokeWidth={3} />
      {width > 70 && height > 34 && (
        <text x={x + 10} y={y + 20} fill="white" fontSize={11} fontWeight={700}>
          {name?.length > 15 ? name.slice(0, 15) + '…' : name}
        </text>
      )}
      {width > 70 && height > 50 && (
        <text x={x + 10} y={y + 36} fill="rgba(255,255,255,0.8)" fontSize={10}>
          {formatCurrency(value)}
        </text>
      )}
    </g>
  );
}

// ── SVG Gauge (stock health) ─────────────────────────────────────────────────
function StockGauge({ pct, color, label }) {
  const cx = 80, cy = 64, r = 50;
  const clamp = Math.min(1, Math.max(0, pct));
  const angleDeg = 180 - clamp * 180;
  const rad = angleDeg * Math.PI / 180;
  const ex = cx + r * Math.cos(rad);
  const ey = cy - r * Math.sin(rad);
  const largeArc = clamp > 0.5 ? 1 : 0;
  const nx = cx + r * 0.7 * Math.cos(rad);
  const ny = cy - r * 0.7 * Math.sin(rad);

  const score = Math.round(clamp * 100);
  const health = score >= 75 ? 'Healthy' : score >= 40 ? 'At Risk' : 'Critical';
  const healthColor = score >= 75 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <svg viewBox="0 0 160 95" className="w-full max-w-[200px] mx-auto">
      {/* Track segments */}
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx} ${cy - r}`}
        fill="none" stroke="#fee2e2" strokeWidth={9} strokeLinecap="round" />
      <path d={`M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx + r * Math.cos(Math.PI * 0.25)} ${cy - r * Math.sin(Math.PI * 0.25)}`}
        fill="none" stroke="#fef3c7" strokeWidth={9} strokeLinecap="round" />
      <path d={`M ${cx + r * Math.cos(Math.PI * 0.25)} ${cy - r * Math.sin(Math.PI * 0.25)} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`}
        fill="none" stroke="#d1fae5" strokeWidth={9} strokeLinecap="round" />
      {/* Value arc */}
      {clamp > 0.01 && (
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 0 ${ex} ${ey}`}
          fill="none" stroke={color} strokeWidth={9} strokeLinecap="round" />
      )}
      {/* Needle */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#1e293b" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={5} fill="#1e293b" />
      {/* Labels */}
      <text x={cx} y={cy - 12} textAnchor="middle" fontSize={17} fontWeight="bold" fill="#0f172a">{score}</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize={9} fontWeight={700} fill={healthColor}>{health}</text>
      <text x={cx} y={cy + 22} textAnchor="middle" fontSize={8} fill="#94a3b8">{label}</text>
    </svg>
  );
}

export default function InventoryReport() {
  const { data, isLoading } = useQuery({
    queryKey: ['reports-inventory'],
    queryFn: () => getInventoryReport().then(r => r.data),
  });
  if (isLoading) return <PageLoader />;

  const categoryData = (data?.by_category || []).map((c, i) => ({
    name: c.name,
    value: c.stock_value || 0,
    qty: c.total_stock || c.stock_quantity || 0,
    index: i,
    fill: PALETTE[i % PALETTE.length],
  }));

  const lowStockItems = data?.low_stock_products || [];

  // Radial data (top 6)
  const radialData = categoryData.slice(0, 6).map(c => ({
    name: c.name?.length > 14 ? c.name.slice(0, 14) + '…' : c.name,
    value: c.qty,
    fill: c.fill,
  }));

  // Scatter: price vs stock per product (from top_products in low stock list, or synthesize)
  const scatterData = lowStockItems.map((item, i) => ({
    x: parseFloat(item.price || item.selling_price || item.unit_price || i * 10),
    y: item.current_stock || 0,
    z: 60,
    label: item.name,
    category: item.category__name,
  }));

  // Stock health score: healthy items / total products
  const totalP = data?.summary?.total_products || 1;
  const lowCount = data?.summary?.low_stock_count || 0;
  const outCount = data?.summary?.out_of_stock || 0;
  const healthScore = Math.max(0, (totalP - lowCount - outCount) / totalP);

  const stats = [
    { label: 'Total Products', value: data?.summary?.total_products || 0, color: 'text-indigo-600', bg: 'bg-indigo-50', icon: Package },
    { label: 'Stock Value', value: formatCurrency(data?.summary?.total_stock_value || 0), color: 'text-emerald-600', bg: 'bg-emerald-50', icon: DollarSign },
    { label: 'Low Stock', value: lowCount, color: 'text-amber-600', bg: 'bg-amber-50', icon: AlertTriangle },
    { label: 'Out of Stock', value: outCount, color: 'text-red-500', bg: 'bg-red-50', icon: XCircle },
  ];

  return (
    <div className="space-y-6">
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

      {/* Row 1 — Treemap full width */}
      <Card>
        <CardHeader title="Stock Value by Category — Treemap" subtitle="Block area = proportional stock value" />
        <ResponsiveContainer width="100%" height={300}>
          <Treemap data={categoryData} dataKey="value" aspectRatio={4 / 3}
            stroke="white" content={<InvTreeCell />} />
        </ResponsiveContainer>
      </Card>

      {/* Row 2 — Radial + Gauge */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader title="Category Stock Levels — Radial" subtitle="Arc length = quantity in stock" />
          <ResponsiveContainer width="100%" height={280}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="15%" outerRadius="90%"
              data={radialData} startAngle={180} endAngle={-180}>
              <RadialBar minAngle={10} background={{ fill: '#f8fafc' }} dataKey="value"
                label={{ position: 'insideStart', fill: '#fff', fontSize: 9, fontWeight: 700 }} />
              <Legend iconType="circle" iconSize={8} formatter={v => <span className="text-xs">{v}</span>} />
              <Tooltip formatter={v => [`${v} units`, 'Stock']} />
            </RadialBarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardHeader title="Stock Health Score" subtitle="% of healthy products" />
          <div className="flex items-center justify-center pt-4">
            <StockGauge
              pct={healthScore}
              color={healthScore >= 0.75 ? '#10b981' : healthScore >= 0.4 ? '#f59e0b' : '#ef4444'}
              label="Stock Health"
            />
          </div>
          <div className="mt-4 space-y-2 px-2">
            {[
              { label: 'Healthy', count: Math.max(0, totalP - lowCount - outCount), color: 'bg-emerald-500' },
              { label: 'Low Stock', count: lowCount, color: 'bg-amber-500' },
              { label: 'Out of Stock', count: outCount, color: 'bg-red-500' },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-2 text-xs">
                <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                <span className="text-gray-500 flex-1">{label}</span>
                <span className="font-semibold text-gray-700">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 3 — Scatter (price vs stock) + Low stock progress */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Price vs Stock Level" subtitle="Each bubble = low stock product" />
          {scatterData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="x" type="number" name="Unit Price" tick={{ fontSize: 10 }}
                  tickFormatter={v => `₹${v}`}
                  label={{ value: 'Unit Price (₹)', position: 'insideBottom', offset: -14, fontSize: 10, fill: '#94a3b8' }} />
                <YAxis dataKey="y" type="number" name="Stock" tick={{ fontSize: 10 }}
                  label={{ value: 'Stock Qty', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }} />
                <ZAxis dataKey="z" range={[50, 50]} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
                      <p className="font-bold text-gray-700 mb-1">{d?.label}</p>
                      <p className="text-gray-500">{d?.category}</p>
                      <p className="text-amber-600">Stock: {d?.y} units</p>
                      <p className="text-indigo-600">Price: {formatCurrency(d?.x)}</p>
                    </div>
                  );
                }} />
                <Scatter data={scatterData} fill="#ef4444" fillOpacity={0.75} />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-52">
              <p className="text-sm text-gray-400">No low stock data to plot</p>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Low Stock Alert"
            subtitle={`${lowStockItems.length} product${lowStockItems.length !== 1 ? 's' : ''} need restocking`} />
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {lowStockItems.map(item => {
              const pct = item.min_stock_level > 0
                ? Math.min(100, Math.round((item.current_stock / item.min_stock_level) * 100))
                : 0;
              return (
                <div key={item.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-400">{item.category__name}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-red-600">{item.current_stock}</span>
                      <p className="text-xs text-gray-400">min {item.min_stock_level}</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`h-2 rounded-full ${pct < 30 ? 'bg-red-500' : pct < 65 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-right text-gray-400 mt-0.5">{pct}% of min</p>
                </div>
              );
            })}
            {!lowStockItems.length && (
              <div className="text-center py-10">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-sm text-emerald-600 font-medium">All stocks are healthy</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Row 4 — Dual axis bar: value vs qty */}
      {categoryData.length > 0 && (
        <Card>
          <CardHeader title="Category Value vs Quantity" subtitle="Dual Y-axis comparison" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v, name) => name === 'Stock Value' ? formatCurrency(v) : `${v} units`} />
              <Legend />
              <Bar yAxisId="left" dataKey="value" name="Stock Value" radius={[4, 4, 0, 0]}>
                {categoryData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Bar>
              <Bar yAxisId="right" dataKey="qty" name="Quantity" fill="#06b6d4" radius={[4, 4, 0, 0]} opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
