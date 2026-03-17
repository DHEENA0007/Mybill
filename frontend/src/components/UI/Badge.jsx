const colors = {
  green: 'bg-emerald-100 text-emerald-700',
  red: 'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700',
  gray: 'bg-gray-100 text-gray-600',
  indigo: 'bg-indigo-100 text-indigo-700',
};

export default function Badge({ children, color = 'gray', className = '' }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]} ${className}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const map = {
    paid: { color: 'green', label: 'Paid' },
    partial: { color: 'amber', label: 'Partial' },
    pending: { color: 'red', label: 'Pending' },
    cancelled: { color: 'gray', label: 'Cancelled' },
    active: { color: 'green', label: 'Active' },
    inactive: { color: 'gray', label: 'Inactive' },
  };
  const { color, label } = map[status?.toLowerCase()] || { color: 'gray', label: status };
  return <Badge color={color}>{label}</Badge>;
}
