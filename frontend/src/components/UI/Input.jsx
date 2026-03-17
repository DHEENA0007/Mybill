export default function Input({ label, error, className = '', prefix, suffix, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <div className="relative flex items-center">
        {prefix && <span className="absolute left-3 text-gray-400 text-sm">{prefix}</span>}
        <input
          className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'} ${prefix ? 'pl-8' : ''} ${suffix ? 'pr-8' : ''} ${className}`}
          {...props}
        />
        {suffix && <span className="absolute right-3 text-gray-400 text-sm">{suffix}</span>}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
