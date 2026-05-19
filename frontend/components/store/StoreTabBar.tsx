type Tab = { key: string; label: string; icon: string };

interface StoreTabBarProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
}

export function StoreTabBar({ tabs, active, onChange }: StoreTabBarProps) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-800 mb-8">
      <nav className="flex gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              active === tab.key
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
