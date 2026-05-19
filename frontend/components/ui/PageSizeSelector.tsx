interface PageSizeSelectorProps {
  value: number;
  onChange: (n: number) => void;
  options?: number[];
  className?: string;
}

export function PageSizeSelector({ value, onChange, options = [10, 25, 50, 100], className = '' }: PageSizeSelectorProps) {
  return (
    <div className={`flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 ${className}`}>
      <span>Rows:</span>
      <select
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        {options.map(n => (
          <option key={n} value={n}>{n} rows</option>
        ))}
      </select>
    </div>
  );
}
