import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';

export default function Table({ columns, data, loading, emptyMessage = 'No data found', onRowClick }) {
  return (
    <div className="overflow-x-auto">
      {loading ? (
        <div className="flex items-center justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : !data?.length ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {columns.map((col, ci) => (
                <th key={col.key ?? `col-${ci}`} className={`py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${col.className || ''}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => {
              const rowKey = row.id != null ? row.id : i;
              return (
                <tr
                  key={rowKey}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-gray-50 hover:bg-gray-50/70 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col, ci) => (
                    <td key={col.key ?? `col-${ci}`} className={`py-3.5 px-4 text-gray-700 ${col.className || ''}`}>
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '-')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
