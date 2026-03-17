import { PackageOpen } from 'lucide-react';

export default function EmptyState({ message = 'No data found', icon: Icon = PackageOpen, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="w-12 h-12 text-gray-300 mb-3" />
      <p className="text-gray-500 text-sm">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
