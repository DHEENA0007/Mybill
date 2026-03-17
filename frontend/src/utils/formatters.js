export const formatCurrency = (amount, currency = '₹') =>
  `${currency}${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const statusColor = (status) => {
  const map = {
    paid: 'bg-emerald-100 text-emerald-700',
    partial: 'bg-amber-100 text-amber-700',
    pending: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-600',
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-gray-100 text-gray-600',
    low: 'bg-red-100 text-red-700',
    normal: 'bg-emerald-100 text-emerald-700',
  };
  return map[status?.toLowerCase()] || 'bg-gray-100 text-gray-600';
};
