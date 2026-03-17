export default function StatCard({ title, value, subtitle, icon: Icon, color = 'indigo', trend }) {
  const colors = {
    indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'border-indigo-100' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-100' },
    red: { bg: 'bg-red-50', icon: 'text-red-600', border: 'border-red-100' },
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-100' },
  };
  const c = colors[color];
  return (
    <div className={`bg-white rounded-xl border ${c.border} p-5 shadow-sm flex items-start gap-4`}>
      <div className={`${c.bg} rounded-lg p-3 flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${c.icon}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        {trend !== undefined && (
          <p className={`text-xs font-medium mt-1 ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last month
          </p>
        )}
      </div>
    </div>
  );
}
