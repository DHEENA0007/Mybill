import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, onPageChange, count, pageSize = 20 }) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, count);
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      <p className="text-sm text-gray-500">Showing {from}–{to} of {count}</p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          const p = totalPages <= 7 ? i + 1 : i < 3 ? i + 1 : i === 3 ? page : i === 4 ? '...' : totalPages - (6 - i);
          return typeof p === 'number' ? (
            <button key={p} onClick={() => onPageChange(p)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === page ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 text-gray-600'}`}>{p}</button>
          ) : <span key={i} className="px-1 text-gray-400">…</span>;
        })}
        <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
